import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const b2Client = new S3Client({
    region: "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
    },
});

export const generateUploadUrl = async (fileName: string) => {
    const command = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME!,
        Key: `invoices/${fileName}`,
        ContentType: "application/pdf",
    });

    return await getSignedUrl(b2Client, command, { expiresIn: 3600 });
};

export const getPublicUrl = (fileKey: string) => {
    return `${process.env.B2_PUBLIC_URL}/${fileKey}`;
};


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