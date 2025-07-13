"use server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
//import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const b2Client = new S3Client({
    endpoint: process.env.AWS_ENDPOINT,
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Required for Backblaze B2
});

// export const generateUploadUrl = async (fileName: string) => {
//     const command = new PutObjectCommand({
//         Bucket: process.env.AWS_BUCKET_NAME!,
//         Key: `invoices/${fileName}`,
//         ContentType: "application/pdf",
//     });

//     return await getSignedUrl(b2Client, command, { expiresIn: 3600 });
// };
export const uploadPDFToB2 = async (file: File, invoiceNumber = "test") => {
    const fileName = `${invoiceNumber || 'invoice'}-${Date.now()}.pdf`;

    // Convert File to Buffer for S3 upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Debug logging
    console.log('File size:', file.size);
    console.log('Buffer size:', fileBuffer.length);
    console.log('Bucket name:', process.env.AWS_BUCKET_NAME);
    console.log('Endpoint:', process.env.AWS_ENDPOINT);
    console.log('Region:', process.env.AWS_REGION);
    console.log('File name:', fileName);

    if (fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
    }

    try {
        // Upload to B2 with additional headers
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: `invoices/${fileName}`,
            Body: fileBuffer,
            ContentType: "application/pdf",
            ContentLength: fileBuffer.length,
        });

        const result = await b2Client.send(command);
        console.log('Upload successful:', result);
        return true;
    } catch (error) {
        console.error('Upload error details:', error);
        throw error;
    }
};


// export const getPublicUrl = (fileKey: string) => {
//     return `${process.env.B2_PUBLIC_URL}/${fileKey}`;
// };


export const uploadToB2 = async (file: File, invoiceNumber: string) => {
    const fileName = `${invoiceNumber}-${Date.now()}.pdf`;

    // Get signed URL from backend
    const response = await fetch('/api/b2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
    });

    if (!response.ok) throw new Error('Failed to get upload URL');

    const { url } = await response.json();

    // Upload directly to B2
    const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' }
    });

    if (!uploadResponse.ok) throw new Error('Upload failed');

    return `invoices/${fileName}`;
};