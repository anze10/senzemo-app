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

export const readDataFromPort = async (
  port: SerialPort,
  onDataReceived: (data: string) => void,
) => {
  if (typeof port !== "object" || port === null) {
    console.error("Invalid port object");
    return;
  }

  const textDecoder = new TextDecoderStream();
  const readableStream = port.readable;

  if (!readableStream) {
    console.error("Port does not have a readable stream.");
    return;
  }

  if (readableStream.locked) {
    console.error("Readable stream is already locked.");
    return;
  }

  const readableStreamClosed = readableStream.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  let receivedData = "";
  let isJsonStarted = false;
  let openBracesCount = 0;
  let closeBracesCount = 0;

  console.log("Reading data...");
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Stream closed.");
        break;
      }
      if (value) {
        console.log("Received raw data chunk:", value);

        if (value.includes("{")) {
          isJsonStarted = true;
        }

        if (isJsonStarted) {
          receivedData += value;

          openBracesCount += (value.match(/{/g) ?? []).length;
          closeBracesCount += (value.match(/}/g) ?? []).length;

          if (openBracesCount === closeBracesCount && openBracesCount > 0) {
            console.log("Received full JSON string:", receivedData);

            onDataReceived(receivedData);

            receivedData = "";
            openBracesCount = 0;
            closeBracesCount = 0;
            isJsonStarted = false;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error reading data:", error);
  } finally {
    reader.releaseLock();
    console.log("Reader lock released.");
  }
};
