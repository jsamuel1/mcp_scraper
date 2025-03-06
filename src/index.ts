// Import necessary modules from the MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Import zod for schema validation and type safety
import { z } from "zod";

// Define constants for the National Weather Service API
const NWS_API_BASE = "https://api.weather.gov"; // Base URL for the NWS API
const USER_AGENT = "weather-app/1.0"; // User-Agent header value for API requests

// Create an MCP server instance with a name and version
// This is the main entry point for our MCP implementation
const server = new McpServer({
  name: "weather", // Server identifier in the MCP ecosystem
  version: "1.0.0" // Semantic versioning for our server
});

/**
 * Helper function to make requests to the National Weather Service API
 *
 * @param url - The full URL endpoint to request data from
 * @returns A Promise that resolves to the parsed JSON response, or null if the request fails
 * @template T - Type parameter for the expected response data structure
 */
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  // Create headers for the API request
  // NWS API requires a User-Agent header and prefers geo+json format
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json"
  };

  try {
    // Make the HTTP request with fetch API
    const response = await fetch(url, { headers });

    // Check if the response was successful (status code 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response and cast it to the expected type
    return (await response.json()) as T;
  } catch (error) {
    // Log any errors that occur during the request
    console.error("Error making NWS request:", error);
    return null; // Return null to indicate a failed request
  }
}

/**
 * Interface defining the structure of a weather alert feature
 * This matches the expected JSON structure from the NWS alerts endpoint
 */
interface AlertFeature {
  properties: {
    event?: string; // Type of weather event (e.g., "Flood Warning")
    areaDesc?: string; // Geographic area affected by the alert
    severity?: string; // Severity level (e.g., "Moderate", "Severe")
    status?: string; // Current status of the alert
    headline?: string; // Brief headline describing the alert
  };
}

/**
 * Utility function to format weather alert data into a human-readable string
 *
 * @param feature - An AlertFeature object containing alert information
 * @returns A formatted string with alert details
 */
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---" // Separator for multiple alerts
  ].join("\n"); // Join lines with newline characters
}

/**
 * Interface for a weather forecast period
 * This matches the expected structure from the NWS forecast endpoint
 */
interface ForecastPeriod {
  name?: string; // Time period name (e.g., "Tonight", "Wednesday")
  temperature?: number; // Forecast temperature
  temperatureUnit?: string; // Temperature unit (F or C)
  windSpeed?: string; // Wind speed description
  windDirection?: string; // Wind direction (e.g., "NW")
  shortForecast?: string; // Brief forecast description
}

/**
 * Interface for the alerts response from the NWS API
 */
interface AlertsResponse {
  features: AlertFeature[]; // Array of alert features
}

/**
 * Interface for the points response from the NWS API
 * This endpoint provides metadata about a geographic point
 */
interface PointsResponse {
  properties: {
    forecast?: string; // URL to the forecast endpoint for this location
  };
}

/**
 * Interface for the forecast response from the NWS API
 */
interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[]; // Array of forecast periods
  };
}

// Register a tool for getting weather alerts by state
// Tools in MCP are functions that can be invoked by clients (like Claude)
server.tool(
  "get-alerts", // Tool name - used by clients to call this tool
  "Get weather alerts for a state", // Tool description - helps clients understand the purpose
  {
    // Define the input schema using zod for validation
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)")
  },
  // Tool implementation function - what happens when this tool is called
  async ({ state }) => {
    // Convert state code to uppercase for consistency
    const stateCode = state.toUpperCase();

    // Construct the API URL for alerts in this state
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;

    // Make the API request to get alerts data
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    // Handle the case where the API request failed
    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data"
          }
        ]
      };
    }

    // Get the array of alert features, or an empty array if none
    const features = alertsData.features || [];

    // Handle the case where there are no active alerts
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`
          }
        ]
      };
    }

    // Format each alert feature into a readable string
    const formattedAlerts = features.map(formatAlert);

    // Combine all alerts into a single text response
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    // Return the tool result in the format expected by the MCP protocol
    return {
      content: [
        {
          type: "text", // Content type is text (could also be image, etc.)
          text: alertsText // The actual response text
        }
      ]
    };
  }
);

// Register a tool for getting weather forecasts by location coordinates
server.tool(
  "get-forecast", // Tool name
  "Get weather forecast for a location", // Tool description
  {
    // Input schema with validation constraints
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location")
  },
  // Tool implementation function
  async ({ latitude, longitude }) => {
    // Step 1: Get grid point data for these coordinates
    // The NWS API requires first getting the "grid point" for a location
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    // Handle failure to get grid point data
    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`
          }
        ]
      };
    }

    // Step 2: Extract the forecast URL from the points data
    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data"
          }
        ]
      };
    }

    // Step 3: Get the actual forecast data using the URL from step 2
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data"
          }
        ]
      };
    }

    // Step 4: Extract the forecast periods from the response
    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available"
          }
        ]
      };
    }

    // Step 5: Format each forecast period into a readable string
    const formattedForecast = periods.map((period: ForecastPeriod) => [`${period.name || "Unknown"}:`, `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`, `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`, `${period.shortForecast || "No forecast available"}`, "---"].join("\n"));

    // Step 6: Combine all forecast periods into a single response
    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    // Return the formatted forecast
    return {
      content: [
        {
          type: "text",
          text: forecastText
        }
      ]
    };
  }
);

/**
 * Main function to initialize and connect the MCP server
 */
async function main() {
  // Create a stdio transport for communication
  // This allows the server to communicate with clients via standard input/output
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  // This starts listening for incoming messages and enables communication
  await server.connect(transport);

  // Log a message to indicate the server is running
  // Note: Using console.error instead of console.log because stdout is used for MCP communication
  console.error("Weather MCP Server running on stdio");
}

// Call the main function and handle any fatal errors
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1); // Exit with error code 1 if there's a fatal error
});
