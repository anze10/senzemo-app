export const connectToPort = async (): Promise<SerialPort> => {
  try {
    console.log("Requesting port...", navigator.serial);

    const port = await navigator.serial.requestPort();
    console.log("Port requested:", port);

    console.log("Opening port...");
    await port.open({ baudRate: 4800 });
    console.log("Port opened.");

    return port;
  } catch (error) {
    console.error("Error opening port:", error);
    throw error;
  }
};

export async function readDataFromPort(port: SerialPort) {
  if (typeof port !== "object" || port === null) {
    console.error("Invalid port object");
    return;
  }

  try {
    const writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode("R"));
    writer.releaseLock();
  } catch (error) {
    console.error("Error writing to port:", error);
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
