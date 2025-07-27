"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Send, History, User } from "lucide-react"

interface Comment {
  id: string
  text: string
  author: string
  createdAt: Date
  type: "comment" | "history"
}

interface TaskCommentsProps {
  taskId: string
  comments: Comment[]
  onAddComment: (taskId: string, comment: string) => void
}

export function TaskComments({ taskId, comments, onAddComment }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("")

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(taskId, newComment.trim())
      setNewComment("")
    }
  }

  const sortedComments = comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentários e Histórico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar comentário */}
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={!newComment.trim()} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Comentar
          </Button>
        </div>

        <Separator />

        {/* Lista de comentários */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedComments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {comment.type === "comment" ? (
                    <User className="h-4 w-4 text-blue-500" />
                  ) : (
                    <History className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.author}</span>
                    <Badge variant={comment.type === "comment" ? "default" : "secondary"} className="text-xs">
                      {comment.type === "comment" ? "Comentário" : "Histórico"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
