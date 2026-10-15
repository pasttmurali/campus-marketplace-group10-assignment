import assert from "node:assert/strict";
import test from "node:test";
import {
  isLocalImage,
  isValidImageReference,
  isValidImageUrl,
} from "../src/utils/validateImageUrl.ts";

test("accepts public HTTP and HTTPS image URLs", () => {
  assert.equal(isValidImageUrl("https://images.example.com/item.jpg"), true);
  assert.equal(isValidImageUrl("http://images.example.com/item.png?size=large"), true);
});

test("allows an empty optional image URL", () => {
  assert.equal(isValidImageUrl(""), false);
  assert.equal(isValidImageReference(""), true);
});

test("rejects malformed URLs and non-web schemes", () => {
  assert.equal(isValidImageUrl("not a URL"), false);
  assert.equal(isValidImageUrl("file:///item.jpg"), false);
  assert.equal(isValidImageUrl("data:image/png;base64,abc"), false);
  assert.equal(isValidImageReference("not a URL"), false);
});

test("accepts selected device image URIs for upload", () => {
  assert.equal(isLocalImage("file:///item.jpg"), true);
  assert.equal(isLocalImage("content://media/item.jpg"), true);
  assert.equal(isValidImageReference("file:///item.jpg"), true);
});
