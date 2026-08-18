"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Send, Loader2, Bot, User } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AdvisorChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const res = await fetch("/api/hms-cockpit/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Beklager, noe gikk galt." },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Kunne ikke kontakte rådgiveren. Prøv igjen." },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm">HMS-rådgiver</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="text-muted-foreground"
        >
          ✕
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Hei! Spør meg om HMS-status,</p>
              <p>forbedringsforslag eller regelverk.</p>
              <div className="mt-3 space-y-1">
                {[
                  "Hva bør vi fokusere på?",
                  "Forklar HMS-scoren vår",
                  "Hvordan forbedre avviksbehandling?",
                ].map((q) => (
                  <button
                    key={q}
                    className="block w-full text-left text-xs text-primary hover:underline px-2 py-0.5"
                    onClick={() => {
                      setInput(q)
                    }}
                  >
                    → {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <Bot className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Tenker...</span>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2 mt-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Spør om HMS..."
            disabled={loading}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
