import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined in environment variables");
}

type RequestBody = {
  prompt: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const { prompt } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt é obrigatório" },
        { status: 400 }
      );
    }

    // Build messages for OpenAI
    const messages = [
      {
        role: "system" as const,
        content:
          "Você é um assistente que ajuda a compor mensagens para WhatsApp em atendimento ao cliente. O usuário vai descrever uma situação e você deve gerar exatamente 3 sugestões de mensagens curtas, objetivas e profissionais para responder. Cada sugestão deve ter no máximo 100 caracteres. Retorne APENAS um JSON array com 3 strings, nada de markdown ou explicações. Exemplo: [\"Oi! Vou verificar para você\", \"Deixa eu consultar\", \"Um momento, vou checar\"]",
      },
      {
        role: "user" as const,
        content: `Situação: ${prompt}\n\nGere 3 sugestões de mensagens curtas e objetivas para responder:`,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Erro ao gerar sugestões" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message.content || "";

    // Parse the JSON response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .map((item) =>
              typeof item === "string" ? item : item.text || item
            )
            .filter((s: string) => s && s.length > 0);
        }
      }
    } catch {
      // If parsing fails, try to extract lines
      const lines = content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^[\d.)\-*\s]+/, "").trim())
        .filter((line) => line.length > 0 && line.length < 150);

      suggestions = lines.slice(0, 3);
    }

    // Ensure we have at least some suggestions
    if (suggestions.length === 0) {
      suggestions = [
        "Vou verificar isso para você",
        "Deixa eu consultar sobre isso",
        "Um momento, vou checar",
      ];
    }

    return NextResponse.json({
      suggestions: suggestions.slice(0, 3),
    });
  } catch (error) {
    console.error("Error generating message:", error);
    return NextResponse.json(
      { error: "Erro ao gerar sugestões" },
      { status: 500 }
    );
  }
}
