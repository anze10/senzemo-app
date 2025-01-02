"use server"
import  ipp from "ipp";
import type { PrintJobRequest } from "ipp"

import request from 'request';

export interface Tiskalnik {
    name: string; 
    url: string; 
}
// Define Printer interface

//type GetPrinterUrlsCallback = (error: Error | null, printerUrls: string[]) => void;

export async function getPrinterUrls(): Promise<Tiskalnik[]> {
    "use server";

    return new Promise((resolve, reject) => {
        const CUPSurl = 'http://localhost:631/printers';
        console.log("Starting getPrinterUrls...");

        request(CUPSurl, (error: Error | null, response: request.Response, body: string) => {
            const printerUrls: Tiskalnik[] = [];
           

            if (!error && response.statusCode === 200) {
                const printersMatches = body.match(/<TR><TD><A HREF="\/printers\/([a-zA-Z0-9-_]+)">([^<]+)<\/A><\/TD><TD>[^<]+<\/TD><TD>[^<]*<\/TD><TD>[^<]+<\/TD><TD>[^<]+<\/TD><\/TR>/gm);
                console.log("printersMatches:", printersMatches);
                if (printersMatches) {
                    for (const match of printersMatches) {
                        const a = /<A HREF="\/printers\/([a-zA-Z0-9-_]+)">([^<]+)<\/A>/.exec(match);
                        if (a) {
                            console.log("Fetched printer URLs:", a[1]);
                            if (a[1] === undefined) {
                                printerUrls.push({
                                    name: "unknown", 
                                    url: `something went wrong` });
                            }
                            else {
                            printerUrls.push({
                                name: a[1], 
                                url: `${CUPSurl}/${a[1]}` });
                            }    
                        }
                    }
                }
                resolve(printerUrls);
            } else {
                console.error('Failed to fetch printers:', error);
                reject(error);
            }
        });
        
    });
}


// Function to check printer status and print
async function doPrintOnSelectedPrinter(printerUri: string, bufferToBePrinted: Buffer, callback: (result: string) => void) {
    
    try {
        
        // Check printer status via IPP
        const printer =  new ipp.Printer(printerUri);
        
        
        printer.execute("Get-Printer-Attributes" , null, (err: Error, res: unknown) => {
            if (err) {
                console.error("Error getting printer attributes:", err);
                callback("Failed to get printer attributes");
                return;
            }

            const printerStatus = (res as { 'printer-attributes-tag': { 'printer-state': string } })['printer-attributes-tag']['printer-state'];
            console.log(`Printer status: ${printerStatus}`); // Log the printer status

            if (printerStatus === 'idle') {
                console.log("Printer is ready, sending print job...");

                // Create print job
                const msg = {
                    "operation-attributes-tag": {
                        "requesting-user-name": "admin",
                        "job-name": "testing",
                        "document-format": "text/plain" // ZPL format for Zebra printers
                    },
                    "job-attributes-tag": {},
                    data: bufferToBePrinted
                };

                // Send the print job
                printer.execute("Print-Job", msg as PrintJobRequest, (err: Error, res: unknown) => {
                    if (err) {
                        console.error("Error printing job:", err);
                        callback("Print job failed: " + JSON.stringify(err)); // Include detailed error message
                    } else {
                        console.log("Print job sent successfully!", res); // Log successful response
                        callback("Print job sent successfully!");
                    }
                });
            } else {
                console.error(`Printer is not ready, status: ${printerStatus}`);
                callback(`Printer is not ready, status: ${printerStatus}`);
            }
        });
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
^FDThis is Montserrat Font^FS

^PQ1,0,1,Y
^XZ
`;
        const bufferToBePrinted = Buffer.from(zplCode, 'utf8');

        // Call the function to print
        await doPrintOnSelectedPrinter(printerUri, bufferToBePrinted, (message: string) => {
            if (message) {
                console.log(message); // Log success/failure
            } else {
                console.log("No message received.");
            }
        }).catch(error => {
            console.error("Error during printing:", error);
        });
    } catch (error) {
        console.error("Error handling print request:", error);
    }
    return { success: true, message: 'Print job sent successfully' };
}




