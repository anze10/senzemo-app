"use server";
import ipp from "ipp";
import type { PrintJobRequest } from "ipp";

import request from "request";
import { prisma } from "~/server/DATABASE_ACTION/prisma";

export interface Tiskalnik {
  name: string;
  url: string;
}

// Define Printer interface

//type GetPrinterUrlsCallback = (error: Error | null, printerUrls: string[]) => void;

export async function getPrinterUrls(): Promise<Tiskalnik[]> {
  "use server";

  return new Promise((resolve, reject) => {
    const CUPSurl = "http://localhost:631/printers";
    console.log("Starting getPrinterUrls...");

    request(
      CUPSurl,
      (error: Error | null, response: request.Response, body: string) => {
        const printerUrls: Tiskalnik[] = [];

        if (!error && response.statusCode === 200) {
          const printersMatches = body.match(
            /<TR><TD><A HREF="\/printers\/([a-zA-Z0-9-_]+)">([^<]+)<\/A><\/TD><TD>[^<]+<\/TD><TD>[^<]*<\/TD><TD>[^<]+<\/TD><TD>[^<]+<\/TD><\/TR>/gm,
          );
          console.log("printersMatches:", printersMatches);
          if (printersMatches) {
            for (const match of printersMatches) {
              const a =
                /<A HREF="\/printers\/([a-zA-Z0-9-_]+)">([^<]+)<\/A>/.exec(
                  match,
                );
              if (a) {
                console.log("Fetched printer URLs:", a[1]);
                if (a[1] === undefined) {
                  printerUrls.push({
                    name: "unknown",
                    url: `something went wrong`,
                  });
                } else {
                  printerUrls.push({
                    name: a[1],
                    url: `${CUPSurl}/${a[1]}`,
                  });
                }
              }
            }
          }
          resolve(printerUrls);
        } else {
          console.error("Failed to fetch printers:", error);
          reject(error);
        }
      },
    );
  });
}

// Function to check printer status and print
async function doPrintOnSelectedPrinter(
  printerUri: string,
  bufferToBePrinted: Buffer,
  callback: (result: string) => void,
) {
  console.log(printerUri);
  console.log("Checking printer status and sending print job...");

  try {
    // Check printer status via IPP
    const printer = new ipp.Printer(printerUri);
    console.log("Printer object created:", printer);
    printer.execute(
      "Get-Printer-Attributes",
      { "operation-attributes-tag": {} },
      (err: Error, res: unknown) => {
        // printer.execute("Get-Printer-Attributes", {}, (err: Error, res: unknown) => {
        if (err) {
          console.error("Error getting printer attributes:", err);
          callback("Failed to get printer attributes");
          return;
        }

        const printerStatus = (
          res as { "printer-attributes-tag": { "printer-state": string } }
        )["printer-attributes-tag"]["printer-state"];
        console.log("Printer status:", printerStatus);
        console.log(`res`, res);
        console.log(`Printer status: ${printerStatus}`); // Log the printer status

        if (printerStatus === "idle") {
          console.log("Printer is ready, sending print job...");

          // Create print job
          const msg = {
            "operation-attributes-tag": {
              "requesting-user-name": "admin",
              "job-name": "testing",
              "document-format": "text/plain", // ZPL format for Zebra printers
            },
            "job-attributes-tag": {},
            data: bufferToBePrinted,
          };

          // Send the print job
          printer.execute(
            "Print-Job",
            msg as PrintJobRequest,
            (err: Error, res: unknown) => {
              if (err) {
                console.error("Error printing job:", err);
                callback(`Print job failed: ${JSON.stringify(err)}`); // Include detailed error message
              } else {
                console.log("Print job sent successfully!", res); // Log successful response
                callback("Print job sent successfully!");
              }
            },
          );
        } else {
          console.error(`Printer is not ready, status: ${printerStatus}`);
          callback(`Printer is not ready, status: ${printerStatus}`);
        }
      },
    );
  } catch (error) {
    console.error("An error occurred while printing:", error);
    callback("An error occurred while processing the print job");
  }
}

// Server-side action to send ZPL print job
export async function handlePrintRequest(printerUri: string) {
  try {
    // Sample ZPL buffer data
    const zplCode = `^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR3,3
~SD20
^JUS
^LRN
^CI27
^PA0,1,1,0
^XZ
^XA
^MMT
^PW320
^LL160
^LS0

^FO12,65^GFA,209,252,12,:Z64:eJxjYCAN8LcxMzAfMLDhBxL2x5kZ2B8U1Mm3PygoeN7MwAckJc4VfEhIb5bgMfhw2IDHcEMC22EJBsMNILaBDVsyA4htzmNgIN9WzMCQbHDYvsfAgPmYMQPDMYPDFmcMDBjSpBkY2/8cNgCyE9L4GZjZIeyCZ/wMbAwGIPMN7I+xS/B/MADZCzSHGcQGu4dErzAAAN7eM/s=:AA35
^FO12,91^GFA,241,420,20,:Z64:eJxjYKAu4G9nPPhBhr3BQP5nw+EDH2xAYvbHmw//sec/ABI7/vBHHUis4Hnzcb5kmQcGEowNZwx7DoPEEtKbj7ExSySAxYwZIGJsx84woInZgMT4gGLyHxuOPy4AmyffBhTjh4lB7GA+5nKGgXEGVC/EDoa0HCQxHogdaTnH2BJRxQqe5RznSZwDct9BmPvsj1lA/fHjfzvUH/JtFgc+yIH8+8OOGepfagMAilpYzQ==:5770
^FO12,33^GFA,145,276,12,:Z64:eJxjYCAN2B9gYOD/cyAZzH6AYBsUMDDwMEDZBkhsiZqEM0A2D5j9D4l9zLD/B1SNZDMS+79hDwOcLQ03R7IBwTZEYhcc5uNhSDgMcc8/Pv4/9Yd5wO6sYeH/I8/MQ6L/QAAA2WUr/Q==:9C78
^FO151,74^GFA,205,304,8,:Z64:eJx10DESAiEMBdAwW1ByBG4iNwNmvBidpVeIs8W27tikQCJ8Vm2U5hVMkp8Q/X5GG1y6iYmsNqMVWlXoVHO3Bk6FLFPKjofRne/Dmm7SNaICd9Tzsj4b3Pg0LR5eM42++pH+iH9eLodbCUe/ODSPOec9j0R3QZ6wIlckC0P2yOtFkX/uw2M11BkVSKF87/ICg9twLg==:FCC5
^FO209,74^GFA,185,336,8,:Z64:eJyNkEEOhCAMRb9h0SVH4CZyNDiaR/EILlkYmccMjG6MkjTvh9L2F+npzMQmTYdkhYARBphghBWmTa4uaMntPCeMMkfKrxDtSRs65E46G3dRv1yb5PPJWPMrzpf60e/fv89r88Ny+hn+ml9DK634z999pnrZb+zb9vel/0e5/a0PnKFCLQ==:6CF5
^FO269,74^GFA,237,416,8,:Z64:eJxjYEAFDkAsAMQKUCzA8AcsxsH//0ADkGaRsakE0Uz2/3+D1DPa//8G1jiBQQdMBzBYgGkDKC3AkAGmJRgqwLRM/QIwLVKvAKaFmCC0IIsDRH0HhJYogNAcClA6AEpD5Tmh6rmYIDQP4wGIPMMBqH0QWoPxAZj2YP4ApjuYf4Ddzf7/C4hmYv//CESzsDE+hmhnYGyAhkEDNAwcGCgH/P///z9ABg0A79w6QA==:109D
^FO97,33^GFA,349,552,24,:Z64:eJy10bFqwzAQBuA7BMpyxasCAZM3kDd36qvYFDJ1yAMEJGNwF4Mfwc8SBJr6ABlTAumqbBpCVMkuafsAueXgG364/wAeOzk77kBvM3QKHS32YTiG0Xl4eXc31Nu89ar1lH2GwYXxcoWik5bpw7MRtRErKjSVCOseqo9lG11aqiztRHTB4JVPvtAHmPwNknMwsz81PVqqLVHy8u7LpmecVBd9HTJH2P66nb3+60Xc55RPsI/5grHZ6/YGG6o2RNhoorurr/DjDP/5mcnZeXLJo6d7sWPlSVQnEYM0rSTHfu6nx9F4ZTzllzD46Nepz+hD41TjJneSg3/wFwG+ATt7esc=:1118

^FO50,130
^A@N,50,30,E:MONTSERRAT.TTF


^PQ1,0,1,Y
^XZ
`;
    const bufferToBePrinted = Buffer.from(zplCode, "utf8");

    // Call the function to print
    await doPrintOnSelectedPrinter(
      printerUri,
      bufferToBePrinted,
      (message: string) => {
        if (message) {
          console.log(message); // Log success/failure
        } else {
          console.log("No message received.");
        }
      },
    ).catch((error) => {
      console.error("Error during printing:", error);
    });
  } catch (error) {
    console.error("Error handling print request:", error);
  }
  return { success: true, message: "Print job sent successfully" };
}
// druga funkcija /////
export async function PrintSticker(
  dev_eui: string,
  family_id: number,
  product_id: number,
  printer_uri: string,
) {
  try {
    // 1. Get ZPL template from DB
    //     const zplTemplate = `CT~~CD,~CC^~CT~
    // ^XA
    // ~TA000
    // ~JSN
    // ^LT0
    // ^MNW
    // ^MTT
    // ^PON
    // ^PMN
    // ^LH0,0
    // ^JMA
    // ^PR4,4
    // ~SD15
    // ^JUS
    // ^LRN
    // ^CI27
    // ^PA0,1,1,0
    // ^XZ
    // ^XA
    // ^MMT
    // ^PW320
    // ^LL160
    // ^LS0
    // ^FO13,15^GFA,401,416,32,:Z64:eJxd0LFqwzAQBuATAnkxyepAwK8g06EqlKiPokdwx0KIZTxkCekj5BXyCBYaspj0EeqSoatDFgWM3ZMwGarp4OPufh1AeALgXzG99OA26VyL6F7bVvrCcQ5rUru5vbQA8tuNh7T2fuoGX/SCk4GWvdze0FVZmippBSP1OamFEiwWHLaU7DkTCp1U2nLlvVloX8xeM00ZZSpO0HNSgeV56H/RAgfFK/SYRipeoq/QL+h+/zXsd8+ZZksbFTvvafnwr/uvbDHf0xFmiY0+Gu/ETPMB94cgLDvCUt6iPDiYKR+YZlEF5x1weWOq8fneTGmsjwU/u6mfX7UCu8/P/n+F0WMVzlJ8utHvH/i7HsH08tShS6I31J+1l1G3Dvl5hl67lLbofxIkj/8=:7376
    // ^FO13,41^GFA,141,117,9,:Z64:eJyzb2BgYP5nYHHA/gGUYfADyGAAMSxkDIyBjGMGMvUWIMZxA57HM4rBIjwH5yT/Aanh+d8DYcj8P3MYrEviABuQYXDAoOIhezODRcEx+w/17c3/5B8ctz9gz9z8j//AMQA2my0L:A787
    // ^FO10,68^GFA,285,259,7,:Z64:eJxFjz8KwjAUxr8YQgeR4iBOgjfwBm28gUJLFx28gYPStXoBr+Do5hHM4l53C4UujoJLqdL4XhzMEPjx8f15wBj84ph/aVv4D4iiwPLO1LE285JUJIkmOjTnWhmMjMpliTAbN57GUM02RG3YBqQtlvcBUc0+jXk0BNG79o0y4maUlqWsSsDbxisNdK2tDKCK4mq43Tpt3p+SJssdUca+nH141T5nrjcukxv+fcGkCXiL0JFbtv+Q1svdTr+5PEkTaaq7FP/zufuOtOCEL/DzYD8=:77CF
    // ^FO76,70^GFA,193,245,7,:Z64:eJxVj7ENwjAQRZ9x4YIiGyQ9Q2CWQpS5klEilsCjeISUFkIxJ59dUD19333/f/ACNtwBYeesiIVFse68FbWwJly9UQX/wX3boi8wZfyuSPgMixCSoj1wNTWrElXqUcR7U7HKP4JWiA/bfMrwZfPZnz1h5Fl678KhgyKjZ7TW/YbJLur3cYHT9gNzbUEf:1F3C
    // ^FO138,63^GFA,241,416,8,:Z64:eJxrYEAFCkDMgcTn4HgHFmNgdXUAC/BpWDSAaBFGAzB/16pVYFqAgQVML2CwgPIh8hpACOEHgGmJugUQvjjEAq4mBQifBWI+RweEzyAA5UO5DAEweQiXEaqei+kAmGZhhMozNEDtc4Da/wBMOzAWgOkOph0Q7UwCIJqJb/UisHYWxgMMUL83gLUjwgPmAnIAR0dHB8g83rt374Jo/v///+OiDyDx2b///w6iAWycLwU=:0E34
    // ^FO91,41^GFA,361,312,24,:Z64:eJwt0DFqwzAUxvEXBNaiSB1dUOoriE5yKfgqMoV2dene2EuyGHKBHuYFFXvsBTo4ePCq0qEqiLiK6frjwfv4C3ACUkLCDXV03/t74ZPVGCBrfFZrSkJBg+h7/yo8p98BcvuWY0Vr+bLjckA9MZD8SkI18WoY1rU+dYmu8Nm2oCVoMI+JMbhGhV2iFJZNCyoFtXhZSzTY8ejH6OYazeIPbToE7INSx9/m4MbMhcWfmDYS+3O8z5vDl5Xxw+Jz4Th2NPqmaVfzp+bLnmneOn7qSNyzsRdPOSjLFDJzy8sdTc27tAwIu+NQ2FBEL8J2f86GDz8LT8TPfwc2ZP7SAXsXOxA6evgDle6B1g==:8AE4
    // ^FO12,120^GFA,509,644,28,:Z64:eJwtkjFOAzEQRb/jwpGQYg6A2JYjpIgSjoREY0GEhw6JS1AnN6Agzk0sUUDp0kLRDjOzuyvZHj3/+TO2sQSWWBLh7Y0gowSALPTL98gIoTnmEhoesoQYiiLP3XOJpxHMtBvxzN9ckbuywC1wDXkUHWXGI/9wA1+URWrxvce/ky77jvKRj933kzHgFilUmQdXA72AkXyJylbAFutYImHrqy8vGGUrBZrYGjcWbHxxZY891gG+mB8StpE8oXtytSuT0FgRprqCFoQlYZsIZ+wPT4cv1bkWPo/C1tis4Kv1XjKPYkCuBOb6IGmEmQ5cmUfVeWNpYqZDaEkGKWwq3NjsB/Sk1XqyWmF+cdYhTToaoMz85v6k9c2k29rmbjm1JdPd4Fo37uGqm/xCmc8s7UgPgjqcnIz5+RqVDecWz139GnAZyPxcy5px4N/IXXSv8ibkei0neJzuvTh5KPBnYcNl8pvfxOILONECCzoc6Krjzv74oewfvMrAnA==:ABE2
    // ^FT241,152^BQN,2,3
    // ^PQ1,0,1,Y
    // ^XZ`;

    const zplTemplate = `
CT~~CD,~CC^~CT~
^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR4,4
~SD25
^JUS
^LRN
^CI27
^PA0,1,1,0
^XZ
^XA
^MMT
^PW320
^LL160
^LS0
^FO13,15^GFA,401,416,32,:Z64:eJxV0DFqwzAUBmAJF3cx8SpDQFeQN09Wj+L0BM+7aSQEyeIcoeQKXbvJZMjYI9SmhazO5kBq9z116gOh4UOPXz9jYeDvYtyz/yOPt7mUDLjXqR0XvDprol6nrm8adP15W0pt0LfHy0Q+dCYdZ/kxzuSVtS7OPUR9J57XMfdq05mHwovv4pyQc+t2FXrlC0gS9HpoWWZUlTlyQI+rHvCgC3p/DQ6Za9FLbufgqlmPoqR87y3LZwV5cGntQr5SOn0rNOV7Nay+KKiD887aHXoiItwZ4f78YNhwUjAEZ8E9yIkb8MH3BjOpjQ35nshrD2JtzWBc8Dbip+KLh/9tO7vssB+RLMfTD/Vzde3jtMjzNJNryo/9qtWLdPd76Be9SfdTQ/4L7E+Xjg==:A2DC
^FO13,41^GFA,141,117,9,:Z64:eJyzb2BgYP5nYHHA/gGUYfADyGAAMSxkDIyBjGMGMvUWIMZxA57HM4rBIjwH5yT/Aanh+d8DYcj8P3MYrEviABuQYXDAoOIhezODRcEx+w/17c3/5B8ctz9gz9z8j//AMQA2my0L:A787
^FO10,69^GFA,189,252,7,:Z64:eJyFz7ENAyEMBVCjK1wyAqOwWASMxihIWYBTGk5C/HxD+iDQK8D2RwDhuogfmwxRwAGVcDceD3RtEpoOEoubhu+JpDgjmRmBDKCQZ0bi7uEr+TQ9iLV+1z/8XpK+604XeZDLmcA7eeVlY1PY06P2ZQHrThb6zqkn9WV/aOJOMsnLykW7fAGpjXmC:10CE
^FO76,70^GFA,169,245,7,:Z64:eJyFj7sRxCAMBZchIKQEOjGlQWmU4hIIFXisk2xMetFqBHofOIBJuCEJyVCFYmhCNajQJlEHCvEiXPbRFgL5JE7DIJ1Q+gt7Hiby7F08942q/R+OfbdUPs3Xwf3K+NxXFk+WbGyWR7unDro7rEbeL8sjjPwAvmpCLQ==:5A97
^FO138,65^GFA,237,400,8,:Z64:eJyl0DEKwlAMBuD/vRatIrSKQ4cOHR0cHB2EdnTsMRwddWrHjh7Bo7yjiF7AQURQiO8lOYEGwjckISE1gMxnqZnhg9qbpOQ6b1xsjkFb0dsDU9EziBOWbIM1u1Iz7NgcB7Zoz+y8LdmZFadxLf29mO/FpFQbVesj7R9bcWKc1OF0n7gwF3Yb3dk+evHdQ3oE7ZCuwXhgbjIO0+kPOv2BLPgvUiJyP/gF78w6QA==:1963
^FO91,40^ADN,18,10^FD{{DEV_EUI}}^FS
^FO12,121^GFA,405,616,28,:Z64:eJxl0j1uxSAMB/A/8pCtvsGjR+gBopdrITUSVL0YVYdeA6lDV6QuDFFcG3hVP5Il5mcEtgPJEDA3J5K5IkiSBF+gD0klXdwOs+3Ao7xKQTzMFqksheVUS1EQ5UOqk9OMc/XPlY+on+nwKb7Je6W2dcP9BY0L6yGuLik6QSMLzbBi56zBlQrlHSfCkhazi9nKWYOVspm+annsC2qWqOmuBLWVQd2y2oUtsf2zQ699cqKsNxG5mSu9vjyNyrDwbU7qtCX/NfgWrGy1fvFp1A03Y/y03G2f5mFF/bZ1HXbtC91m7Rpd8WC26yFuWu79vEPwCGYBTqvvRsWbeWn82cx0frJNE+klSLXxJnoR68IwzNlKIZ37sO0c5yE29L4AkhbQk9rSpo1/6QsVoc1J:2517
^FT220,155^BQN,2,4
^FH\^FDLA,{{DEV_EUI}}^FS
^PQ1,0,1,Y
^XZ

`;
    if (!zplTemplate) {
      throw new Error("ZPL template not found for given family/product");
    }

    // 2. Replace placeholder with actual device EUI
    // Adjust the placeholder pattern to match what is used in your stored ZPL
    const zplCode = zplTemplate.replace(/{{DEV_EUI}}/g, dev_eui);

    // 3. Create buffer and print
    const bufferToBePrinted = Buffer.from(zplCode, "utf8");

    await doPrintOnSelectedPrinter(
      printer_uri,
      bufferToBePrinted,
      (message: string) => {
        if (message) {
          console.log(message);
        } else {
          console.log("No message received.");
        }
      },
    ).catch((error) => {
      console.error("Error during printing:", error);
    });
  } catch (error) {
    console.error("Error handling print request:", error);
  }
  return { success: true, message: "Print job sent successfully" };
}

// function getZplfromDB(family_id: number, product_id: number) {
//   // Get ZPL code from database
//   return prisma.senzor
//     .findFirst({
//       where: {
//         familyId: family_id,
//         productId: product_id,
//       },
//     })
//     .then((data: { zpl: string | null } | null) => {
//       return data ? data.zpl : null;
//     });
// }
