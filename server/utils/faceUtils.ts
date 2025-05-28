// Utility functions for face recognition

// Calculate Euclidean distance between two face descriptors
export function calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
        throw new Error("Vectors must have the same length");
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

// Parse face descriptor from string to array
export function parseFaceDescriptor(descriptorString: string): number[] {
    try {
        // Try parse JSON if it's a JSON string
        if (descriptorString.startsWith('[') || descriptorString.startsWith('{')) {
            return JSON.parse(descriptorString);
        } else {
            // If not JSON, assume it's comma-separated string
            return descriptorString.split(',').map(Number);
        }
    } catch (error) {
        throw new Error(`Error parsing face descriptor: ${error}`);
    }
}

// Validate face descriptor
export function validateFaceDescriptor(descriptor: any): boolean {
    return Array.isArray(descriptor) &&
        descriptor.length > 0 &&
        descriptor.every(val => typeof val === 'number' && !isNaN(val));
} 