// Track operation state to prevent concurrent operations
let isReadingInProgress = false;
let isWritingInProgress = false;

// Connection health tracking
let lastConnectionCheck = Date.now();
let connectionHealthy = true;
let connectionAttemptInProgress = false;
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;
const CONNECTION_CHECK_INTERVAL = 5000; // Check connection every 5 seconds
const RECONNECT_DELAY = 1000; // Wait 1 second between reconnection attempts

// Store the current port reference for monitoring and reconnection
let currentPortRef: SerialPort | null = null;

// Define a global interval ID for connection monitoring
let connectionMonitorInterval: number | null = null;

export const connectToPort = async (): Promise<SerialPort> => {
  try {
    // Prevent multiple concurrent connection attempts
    if (connectionAttemptInProgress) {
      console.log("Connection attempt already in progress, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (currentPortRef && checkPortStatus(currentPortRef)) {
        return currentPortRef;
      }
    }

    connectionAttemptInProgress = true;
    console.log("Requesting port...", navigator.serial);

    const port = await navigator.serial.requestPort();
    console.log("Port requested:", port);

    console.log("Opening port...");
    await port.open({ baudRate: 4800 });
    console.log("Port opened successfully");

    // Verify port is ready
    console.log("Port state after opening:", {
      readable: !!port.readable,
      writable: !!port.writable,
    });

    // Reset tracking variables on successful connection
    connectionHealthy = true;
    lastConnectionCheck = Date.now();
    reconnectionAttempts = 0;
    currentPortRef = port;

    // Start monitoring connection health
    startConnectionMonitoring();

    return port;
  } catch (error) {
    console.error("Error opening port:", error);
    connectionHealthy = false;
    throw error;
  } finally {
    connectionAttemptInProgress = false;
  }
};

// Monitor connection health periodically
function startConnectionMonitoring() {
  // Only start if not already monitoring
  if (connectionMonitorInterval !== null) {
    clearInterval(connectionMonitorInterval);
  }

  connectionMonitorInterval = window.setInterval(async () => {
    // Skip if connection check is too recent
    if (Date.now() - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
      return;
    }

    if (currentPortRef) {
      const isHealthy = checkPortStatus(currentPortRef);

      // Log connection status changes
      if (connectionHealthy !== isHealthy) {
        console.log(
          `Connection status changed: ${connectionHealthy ? "healthy → unhealthy" : "unhealthy → healthy"}`,
        );
        connectionHealthy = isHealthy;
      }

      // Attempt reconnection if unhealthy and not already trying
      if (
        !connectionHealthy &&
        !connectionAttemptInProgress &&
        reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS
      ) {
        console.log(
          `Attempting automatic reconnection (attempt ${reconnectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS})...`,
        );
        tryReconnect();
      }
    }

    lastConnectionCheck = Date.now();
  }, CONNECTION_CHECK_INTERVAL);
}

// Try to reconnect to USB device
async function tryReconnect() {
  if (connectionAttemptInProgress) {
    return;
  }

  reconnectionAttempts++;
  connectionAttemptInProgress = true;

  try {
    console.log("Attempting to reconnect to USB device...");

    // Reset operation flags before reconnection
    resetOperationFlags();

    // Close existing port if possible
    if (currentPortRef) {
      try {
        await currentPortRef.close();
        console.log("Closed existing port connection");
      } catch (err) {
        console.warn("Error closing existing port:", err);
      }
    }

    // Wait before attempting reconnection
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));

    // Attempt to open a new connection
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const selectedPort = ports[0];
        if (selectedPort) {
          await selectedPort.open({ baudRate: 4800 });
          currentPortRef = selectedPort;
          console.log("Automatic reconnection successful");
          connectionHealthy = true;
          reconnectionAttempts = 0;
        } else {
          console.warn("Selected port is undefined");
        }
      } else {
        console.warn("No previously paired ports found");
      }
    } catch (err) {
      console.error("Auto-reconnection failed:", err);
    }
  } finally {
    connectionAttemptInProgress = false;
  }
}

// Helper function to check port status
export const checkPortStatus = (port: SerialPort): boolean => {
  if (!port) {
    console.error("Port object is null or undefined");
    return false;
  }

  const status = {
    exists: !!port,
    readable: !!port?.readable,
    writable: !!port?.writable,
    readableState: port?.readable ? "open" : "closed",
    writableState: port?.writable ? "open" : "closed",
    getInfo: port?.getInfo ? port.getInfo() : "unavailable",
  };

  console.log("Port status:", status);

  // Additional check for undefined port
  if (typeof port !== "object") {
    console.error("Port is not an object");
    return false;
  }

  return status.exists && status.readable && status.writable;
};

export async function readDataFromPort(
  port: SerialPort,
  maxRetries = 3,
): Promise<Uint8Array | null> {
  if (typeof port !== "object" || port === null) {
    console.error("Invalid port object");
    return null;
  }

  // Store current port reference for monitoring
  currentPortRef = port;

  // Check if port streams are available and try recovery if needed
  if (!port.readable || !port.writable) {
    console.error(
      "Port streams not available - readable:",
      !!port.readable,
      "writable:",
      !!port.writable,
    );

    // Try to recover connection
    try {
      console.log("Attempting to recover port connection...");
      await port.close();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await port.open({ baudRate: 4800 });

      if (!port.readable || !port.writable) {
        console.error("Port recovery failed - streams still unavailable");
        return null;
      }
      console.log("Port recovery successful");
    } catch (recoveryError) {
      console.error("Port recovery failed:", recoveryError);
      return null;
    }
  }

  // For multiple sensors (5+), we need to be extra careful about concurrent operations
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    console.log(`Read attempt ${attempts}/${maxRetries}`);

    // Prevent concurrent read operations
    if (isReadingInProgress) {
      console.warn(
        `Read operation already in progress (attempt ${attempts}), waiting...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // If still locked after waiting, try to reset flags if it seems stuck
      if (isReadingInProgress && attempts === maxRetries - 1) {
        console.warn("Read operation seems stuck, resetting flags...");
        resetOperationFlags();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // If still locked after reset, try next attempt
      if (isReadingInProgress) continue;
    }

    isReadingInProgress = true;

    try {
      console.log("Getting writer for read command...");
      const writer = await getWriterSafely(port.writable, 5, 200); // More retries, longer delay

      if (!writer) {
        console.error(
          `Could not acquire writer - stream is locked (attempt ${attempts})`,
        );
        isReadingInProgress = false;

        // Wait before next attempt
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
          continue;
        } else {
          return null;
        }
      }

      console.log("Sending 'R' command...");
      const rCommand = new TextEncoder().encode("R");
      await writer.write(rCommand);
      console.log("✓ 'R' command sent successfully");

      writer.releaseLock();
      console.log("Writer released after R command");

      // Wait a moment for device to process command
      await new Promise((resolve) => setTimeout(resolve, 300));

      const uint8ArrayStream = port.readable as ReadableStream<Uint8Array>;

      // Use the helper function to safely get a reader with more retries
      const reader = await getReaderSafely(uint8ArrayStream, 5, 200);

      if (!reader) {
        console.error(
          `Could not acquire reader - stream is locked (attempt ${attempts})`,
        );
        isReadingInProgress = false;

        // Wait before next attempt
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
          continue;
        } else {
          return null;
        }
      }

      console.log("Reading data with timeout protection...");

      // Use a simple timeout for reading (15 seconds)
      const readTimeout = 15000;
      const startTime = Date.now();

      // Set up a promise that will resolve if we timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn(`Read operation timed out after ${readTimeout}ms`);
          resolve(null);
        }, readTimeout);
      });

      // Create the read promise
      const readPromise = new Promise<Uint8Array | null>(async (resolve) => {
        try {
          while (Date.now() - startTime < readTimeout) {
            const { value, done } = await reader.read();

            if (done) {
              console.log("Stream closed.");
              resolve(null);
              break;
            }

            if (value && value.length > 0) {
              console.log("Received data chunk:", value);
              resolve(value);
              break;
            }

            // Small delay between reads
            await new Promise((r) => setTimeout(r, 50));
          }
          // If we get here without resolving, we timed out
          resolve(null);
        } catch (readError) {
          console.error("Error in read loop:", readError);
          resolve(null);
        }
      });

      // Race the promises
      const result = await Promise.race([readPromise, timeoutPromise]);

      // Clean up: always release the reader
      reader.releaseLock();

      // If we got data, return it (remove strict validation for custom reader)
      if (result) {
        console.log("Raw data received:", result);

        // Log the data in a more readable format
        console.log(
          "Data bytes:",
          Array.from(result)
            .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
            .join(" "),
        );

        isReadingInProgress = false;
        console.log("Successfully read data from custom reader");
        return result;
      }

      console.warn(`No data received in attempt ${attempts}`);

      // If this was the last attempt, give up
      if (attempts >= maxRetries) {
        console.error(`All ${maxRetries} read attempts failed`);
        isReadingInProgress = false;
        return null;
      }

      // Otherwise, reset for the next attempt
      isReadingInProgress = false;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
    } catch (error) {
      console.error(`Error in read attempt ${attempts}:`, error);
      isReadingInProgress = false;

      // If this was the last attempt, give up
      if (attempts >= maxRetries) {
        return null;
      }

      // Otherwise, prepare for the next attempt
      await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
    }
  }

  // All attempts failed
  isReadingInProgress = false;
  return null;
}

export async function writeDataToPort(
  port: SerialPort,
  data: string | Uint8Array,
) {
  if (typeof port !== "object" || port === null) {
    console.error("Invalid port object");
    return;
  }

  // Check if port is actually connected
  if (!port.readable || !port.writable) {
    console.error(
      "Port is not properly connected - readable:",
      !!port.readable,
      "writable:",
      !!port.writable,
    );
    return;
  }

  console.log("Port state before writing:", {
    readable: !!port.readable,
    writable: !!port.writable,
  });

  // Prevent concurrent write operations
  if (isWritingInProgress) {
    console.warn("Write operation already in progress, skipping...");
    return;
  }
  isWritingInProgress = true;

  try {
    // Double-check port streams are available
    if (!port.writable) {
      throw new Error("Port writable stream is not available");
    }

    console.log("Getting writer...");
    const writer = await getWriterSafely(port.writable);

    if (!writer) {
      console.error("Could not acquire writer - stream is locked");
      isWritingInProgress = false;
      return;
    }

    console.log("Writer acquired successfully");

    // Send "W" command first (must be uppercase for sensor to recognize it)
    console.log("Preparing to send 'W' command...");
    const wCommand = new TextEncoder().encode("W");
    console.log("W command bytes:", Array.from(wCommand));

    await writer.write(wCommand);
    console.log("✓ 'W' command sent successfully");

    // Small delay to ensure command is processed
    console.log("Waiting for command processing...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Handle both string and Uint8Array data
    console.log("Preparing to send data...");
    if (typeof data === "string") {
      const encodedData = new TextEncoder().encode(data);
      console.log("Sending string data:", data);
      console.log("String data bytes:", Array.from(encodedData));
      await writer.write(encodedData);
      console.log("✓ String data sent successfully");
    } else {
      // Send Uint8Array directly to the port without converting to hex
      console.log("Sending binary data directly");
      console.log("Binary data bytes:", Array.from(data));
      console.log("Binary data length:", data.length);

      // Send binary data directly
      await writer.write(data);
      console.log("✓ Binary data sent successfully");
    }

    // Additional delay to ensure data is processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    writer.releaseLock();
    console.log("Data written to port successfully, writer released");
  } catch (error) {
    console.error("Error writing to port:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error),
    );
    throw error; // Re-throw to be caught by caller
  } finally {
    isWritingInProgress = false;
  }
}

// Function to reset operation flags in case they get stuck
export function resetOperationFlags() {
  isReadingInProgress = false;
  isWritingInProgress = false;
  console.log("Operation flags reset");
}

// Function to get current operation status
export function getOperationStatus() {
  return {
    isReadingInProgress,
    isWritingInProgress,
    connectionHealthy,
    reconnectionAttempts,
    connectionAttemptInProgress,
  };
}

// Force reconnection function - useful for manual intervention
export async function forceReconnect(): Promise<SerialPort | null> {
  resetOperationFlags();

  if (connectionMonitorInterval !== null) {
    clearInterval(connectionMonitorInterval);
    connectionMonitorInterval = null;
  }

  reconnectionAttempts = 0;
  connectionHealthy = false;

  try {
    console.log("Forcing USB reconnection...");

    // Close existing port if possible
    if (currentPortRef) {
      try {
        await currentPortRef.close();
        console.log("Closed existing port connection");
      } catch (e) {
        console.warn("Error closing port during force reconnect:", e);
      }
      currentPortRef = null;
    }

    // Wait a moment before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("Requesting new port connection...");
    const newPort = await connectToPort();

    // Restart connection monitoring
    startConnectionMonitoring();

    console.log("Reconnection successful");
    return newPort;
  } catch (error) {
    console.error("Force reconnect failed:", error);
    return null;
  }
}

// Helper function to safely get a reader from a potentially locked stream
async function getReaderSafely(
  stream: ReadableStream<Uint8Array>,
  maxRetries = 5,
  delay = 100,
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!stream.locked) {
        return stream.getReader();
      }

      console.log(
        `Stream is locked, waiting... (attempt ${i + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
    } catch (error) {
      console.error(`Error getting reader on attempt ${i + 1}:`, error);
      if (i === maxRetries - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  console.error(
    `Failed to get reader after ${maxRetries} attempts - stream remains locked`,
  );
  return null;
}

// Helper function to safely get a writer from a potentially locked stream
async function getWriterSafely(
  stream: WritableStream<Uint8Array>,
  maxRetries = 5,
  delay = 100,
): Promise<WritableStreamDefaultWriter<Uint8Array> | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!stream.locked) {
        return stream.getWriter();
      }

      console.log(
        `Writable stream is locked, waiting... (attempt ${i + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
    } catch (error) {
      console.error(`Error getting writer on attempt ${i + 1}:`, error);
      if (i === maxRetries - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  console.error(
    `Failed to get writer after ${maxRetries} attempts - stream remains locked`,
  );
  return null;
}
