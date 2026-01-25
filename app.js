import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const engine = new webllm.MLCEngine();

await engine.reload("phi-2-q4f16_1");

async function ask() {
  const q = document.getElementById("q").value;
  const out = document.getElementById("out");

  out.innerText = "Nix 3 is thinking...\n";

  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: "You are Nix 3, a local AI model." },
      { role: "user", content: q }
    ],
    temperature: 0.7,
    max_tokens: 200
  });

  out.innerText += res.choices[0].message.content;
}

window.ask = ask;
