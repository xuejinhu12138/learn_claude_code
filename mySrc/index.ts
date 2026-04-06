import { describeBlock, createUserMessage } from "./message";

const userMessage = createUserMessage("你好");
const blockDescription = describeBlock({ type: "text", content: "hello world" });

console.log(userMessage);
console.log(blockDescription);