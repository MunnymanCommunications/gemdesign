import { GoogleGenAI, Type } from "@google/genai";
import { SecurityAnalysis, AssessmentMode } from '../types';

/**
 * Custom error for when Google Maps API key is likely restricted.
 */
export class MapsRequestDeniedError extends Error {}

/**
 * Converts an image from a URL to a base64 data URL.
 * @param url The URL of the image to convert.
 * @returns A promise that resolves with the base64 data URL.
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches a real satellite aerial view for a given address using Google Maps API.
 * @param address The property address string.
 * @param zoom The zoom level for the map (e.g., 17-21).
 * @returns A promise that resolves to a base64 data URL of the satellite image.
 */
export const getAerialViewFromAddress = async (address: string, zoom: number): Promise<string> => {
  const mapsApiKey = import.meta.env.VITE_MAPS_API_KEY;
  if (!mapsApiKey) {
    throw new Error("Google Maps API Key is not configured. Please ensure VITE_MAPS_API_KEY is set in your environment variables.");
  }
  
  // Step 1: Geocode the address to get latitude and longitude.
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey}`;
  
  let geocodeData;
  try {
    const geocodeResponse = await fetch(geocodeUrl);
    geocodeData = await geocodeResponse.json();
  } catch (networkError) {
    console.error("Network error during geocoding:", networkError);
    throw new Error("A network error occurred while trying to contact Google Maps. Please check your connection.");
  }

  if (geocodeData.status !== 'OK') {
    let userFriendlyError = `Could not find location. Google Maps status: ${geocodeData.status}.`;
    switch (geocodeData.status) {
      case 'ZERO_RESULTS':
        userFriendlyError = "No location could be found for the address entered. Please check for typos and try again.";
        break;
      case 'REQUEST_DENIED':
        userFriendlyError = "The request to Google Maps was denied. This is often due to an issue with the API key. Please ensure the key is correct and that both the 'Geocoding API' and 'Maps Static API' are enabled in your Google Cloud project dashboard.";
        if (geocodeData.error_message) {
            userFriendlyError += ` (Google's message: ${geocodeData.error_message})`;
        }
        // Throw a specific error for this case
        throw new MapsRequestDeniedError(userFriendlyError);
      case 'OVER_QUERY_LIMIT':
        userFriendlyError = "The application has exceeded its daily usage limit for the Google Maps API. Please try again later.";
        break;
      case 'INVALID_REQUEST':
        userFriendlyError = "The request to Google Maps was invalid, which might indicate a problem with the address format.";
        break;
    }
    throw new Error(userFriendlyError);
  }

  if (!geocodeData.results[0]) {
      throw new Error("Google Maps returned a success status but no location data. Please try a different address.");
  }

  const { lat, lng } = geocodeData.results[0].geometry.location;

  // Step 2: Fetch the static satellite map image for the coordinates.
  // Using a fixed, high-resolution size to ensure consistency for the AI analysis across all devices.
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=1024x576&maptype=satellite&key=${mapsApiKey}`;

  // Step 3: Convert the fetched image to a base64 data URL to display in the app.
  try {
    const base64Image = await urlToBase64(staticMapUrl);
    return base64Image;
  } catch (error) {
    console.error("Error fetching or converting map image:", error);
    throw new Error("Failed to retrieve satellite imagery from Google Maps. This can happen if the 'Maps Static API' is not enabled for your API key, even if geocoding works.");
  }
};

const getExteriorPrompt = (address: string, markerCoords: { x: number, y: number } | null): string => {
  let promptText = `You are a world-class physical security consultant. Analyze the provided satellite image for "${address}" and create a professional security camera plan. Your response must be a single, valid JSON object.`;

  if (markerCoords) {
    promptText += `\n\nA user-placed marker at coordinates (x: ${markerCoords.x.toFixed(1)}%, y: ${markerCoords.y.toFixed(1)}%) indicates the primary structure of interest. Prioritize your analysis around this marker.`;
  }

  promptText += `

Follow these directives precisely:

1.  **Zero Blind Spots:** Your primary goal is 100% exterior coverage. Eliminate all blind spots. Place cameras on ALL SIDES of the central building(s) and any significant detached structures to ensure a complete defensive perimeter.
2.  **Professional Mounting:** Mount cameras ONLY on existing infrastructure (building walls, eaves, rooftops, fences, poles). Use rooftops for wide, unobstructed views. For large open areas (parking lots, fields), place cameras on surrounding perimeter structures, not "floating" in the middle of the open space.
3.  **In-Depth Analysis:** Provide a comprehensive security overview. Identify threat vectors, scrutinize access points (doors, windows), and evaluate environmental factors (landscaping for concealment, lighting, etc.).
4.  **Detailed Justification:** For each camera, provide a specific location (using cardinal directions), a detailed reason referencing a specific vulnerability from your overview, and a functional camera type (e.g., "4K Turret Camera with IR").
5.  **Equipment Summary:** Tally the total quantity of each camera type needed in the \`cameraSummary\`.
`;
  return promptText;
}

const getInteriorPrompt = (): string => {
  return `You are a world-class physical security consultant specializing in interior spaces. Analyze the provided floor plan or blueprint and create a professional security camera and sensor plan. Your response must be a single, valid JSON object.

Follow these directives precisely:

1.  **Complete Interior Coverage:** Your primary goal is to eliminate all interior blind spots in high-traffic and high-risk areas. Focus on covering all entry points (doors, windows, garage access), hallways, stairwells, and common areas (living rooms, kitchens).
2.  **Strategic Placement:** Recommend placements that provide clear lines of sight without being overly intrusive. Consider corners of rooms for the widest viewing angles.
3.  **Comprehensive Analysis:** Provide a detailed security overview. Identify vulnerabilities based on the layout, such as unprotected entry points, long hallways that create blind spots, or large windows that are potential weak points.
4.  **Detailed Justification:** For each device, provide a specific location (e.g., "Ceiling corner of the living room overlooking the main entrance", "Above the sliding glass door in the kitchen"), a detailed reason referencing a specific vulnerability, and a functional device type (e.g., "Indoor Dome Camera with Night Vision", "Door/Window Contact Sensor", "Motion Detector").
5.  **Equipment Summary:** Tally the total quantity of each device type needed in the \`cameraSummary\`. This should include all cameras and sensors.`;
}

/**
 * Performs a multimodal security analysis using a property address/image and assessment mode.
 * @param address The property address string (or a placeholder for interior mode).
 * @param imageBase64 The base64-encoded image (satellite or floor plan).
 * @param markerCoords The user-placed coordinates indicating the structure of interest (exterior mode only).
 * @param mode The type of assessment to perform ('exterior' or 'interior').
 * @returns A promise that resolves to a SecurityAnalysis object.
 */
export const getSecurityAnalysis = async (
    address: string, 
    imageBase64: string,
    markerCoords: { x: number, y: number } | null,
    mode: AssessmentMode
): Promise<SecurityAnalysis> => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please ensure VITE_API_KEY is set in your environment variables.");
  }
  
  // Extract the raw base64 data from the data URL prefix.
  const base64Data = imageBase64.split(',')[1];

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg', // Using a common type, Gemini can handle various image formats.
      data: base64Data,
    },
  };
  
  const promptText = mode === 'exterior' ? getExteriorPrompt(address, markerCoords) : getInteriorPrompt();

  const textPart = {
    text: promptText
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      overview: {
        type: Type.STRING,
        description: "A comprehensive security overview of the property. It should detail perimeter security, access points, building vulnerabilities (windows, doors), and environmental factors. This should be a detailed paragraph."
      },
      placements: {
        type: Type.ARRAY,
        description: "A list of recommended camera or sensor placements.",
        items: {
          type: Type.OBJECT,
          required: ["location", "reason", "cameraType"],
          properties: {
            location: {
              type: Type.STRING,
              description: "The specific location for the device (e.g., 'Northeast corner of the house', 'Living room ceiling corner')."
            },
            reason: {
              type: Type.STRING,
              description: "The reason for placing a device here, explaining what it covers and what threats it mitigates."
            },
            cameraType: {
              type: Type.STRING,
              description: "The recommended type of device (e.g., '4K Bullet Camera', 'Door/Window Contact Sensor', 'Indoor Dome Camera')."
            }
          }
        }
      },
      cameraSummary: {
        type: Type.ARRAY,
        description: "A summary list of the total quantity required for each device type.",
        items: {
          type: Type.OBJECT,
          required: ["cameraType", "quantity"],
          properties: {
            cameraType: {
              type: Type.STRING,
              description: "The type of device."
            },
            quantity: {
              type: Type.NUMBER,
              description: "The total number of this device type needed."
            }
          }
        }
      }
    }
  };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    
    const jsonStr = response.text.trim();
    const analysisData = JSON.parse(jsonStr);
    return analysisData as SecurityAnalysis;
  } catch (error) {
    console.error("Error getting security analysis:", error);
    throw new Error("Failed to perform security analysis. The AI model may be unable to process the request.");
  }
};
