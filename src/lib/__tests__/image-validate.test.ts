import { describe, it, expect } from "vitest";
import { detectImageType } from "@/lib/image-validate";

const bytes = (...arr: number[]) => new Uint8Array(arr);

describe("detectImageType", () => {
  it("detects JPEG", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe("jpeg");
  });
  it("detects PNG", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });
  it("detects GIF", () => {
    expect(detectImageType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("gif");
  });
  it("detects WEBP", () => {
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("webp");
  });
  it("rejects non-image / php / svg", () => {
    expect(detectImageType(bytes(0x3c, 0x3f, 0x70, 0x68, 0x70))).toBeNull(); // <?php
    expect(detectImageType(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull(); // <svg
    expect(detectImageType(bytes(0x00, 0x01))).toBeNull();
  });
});
