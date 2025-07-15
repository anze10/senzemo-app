export const connectToPort = async (): Promise<SerialPort> => {
  try {
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

    return port;
  } catch (error) {
    console.error("Error opening port:", error);
    throw error;
  }
};

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

export async function readDataFromPort(port: SerialPort) {
  if (typeof port !== "object" || port === null) {
    console.error("Invalid port object");
    return;
  }

  // Check if port streams are available
  if (!port.readable || !port.writable) {
    console.error(
      "Port streams not available - readable:",
      !!port.readable,
      "writable:",
      !!port.writable,
    );
    return;
  }

  try {
    console.log("Getting writer for read command...");
    const writer = port.writable.getWriter();

    console.log("Sending 'R' command...");
    const rCommand = new TextEncoder().encode("R");
    await writer.write(rCommand); // Pošljemo "R" bralniku
    console.log("✓ 'R' command sent successfully");

    writer.releaseLock();
    console.log("Writer released after R command");
  } catch (error) {
    console.error("Error writing R command to port:", error);
    return;
  }

  const uint8ArrayStream = port.readable as ReadableStream<Uint8Array>;
  const reader = uint8ArrayStream.getReader();

  console.log("Reading data...");
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Stream closed.");
        break;
      }
      if (value) {
        console.log("Received data chunk:", value);
        return value;
      }
    }
  } catch (error) {
    console.error("Error reading data:", error);
  } finally {
    reader.releaseLock();
    console.log("Reader lock released.");
  }
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

  try {
    // Double-check port streams are available
    if (!port.writable) {
      throw new Error("Port writable stream is not available");
    }

    console.log("Getting writer...");
    const writer = port.writable.getWriter();
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
  }
}
