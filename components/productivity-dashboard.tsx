"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Target, Clock, CheckCircle, Award } from "lucide-react"

interface Task {
  id: string
  text: string
  status: string
  priority: string
  startDate?: Date
  endDate?: Date
  createdAt: Date
  completedAt?: Date
  subtasks: any[]
}

interface ProductivityDashboardProps {
  tasks: Task[]
}

export function ProductivityDashboard({ tasks }: ProductivityDashboardProps) {
  // Estatísticas gerais
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length
  const pendingTasks = tasks.filter((t) => t.status === "pending").length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Tarefas por dia (últimos 7 dias)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date
  }).reverse()

  const dailyStats = last7Days.map((date) => {
    const dayTasks = tasks.filter((task) => {
      if (!task.completedAt) return false
      const completedDate = new Date(task.completedAt)
      return completedDate.toDateString() === date.toDateString()
    })

    return {
      date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
      completed: dayTasks.length,
      created: tasks.filter((task) => {
        const createdDate = new Date(task.createdAt)
        return createdDate.toDateString() === date.toDateString()
      }).length,
    }
  })

  // Tarefas por prioridade
  const priorityStats = [
    { name: "Alta", value: tasks.filter((t) => t.priority === "high").length, color: "#ef4444" },
    { name: "Média", value: tasks.filter((t) => t.priority === "medium").length, color: "#f59e0b" },
    { name: "Baixa", value: tasks.filter((t) => t.priority === "low").length, color: "#10b981" },
  ]

  // Tempo médio para conclusão
  const completedTasksWithTime = tasks.filter(
    (task) => task.status === "completed" && task.completedAt && task.createdAt,
  )

  const averageCompletionTime =
    completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((acc, task) => {
          const created = new Date(task.createdAt).getTime()
          const completed = new Date(task.completedAt!).getTime()
          return acc + (completed - created)
        }, 0) /
        completedTasksWithTime.length /
        (1000 * 60 * 60 * 24) // em dias
      : 0

  // Progresso semanal
  const weeklyProgress = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weekTasks = tasks.filter((task) => {
      const taskDate = new Date(task.createdAt)
      return taskDate >= weekStart && taskDate <= weekEnd
    })

    const weekCompleted = weekTasks.filter((t) => t.status === "completed").length

    return {
      week: `Sem ${4 - i}`,
      total: weekTasks.length,
      completed: weekCompleted,
      rate: weekTasks.length > 0 ? (weekCompleted / weekTasks.length) * 100 : 0,
    }
  }).reverse()

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">{completedTasks} concluídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">{pendingTasks} pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompletionTime.toFixed(1)}d</div>
            <p className="text-xs text-muted-foreground">para conclusão</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tarefas Diárias */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
            <CardDescription>Tarefas criadas vs concluídas por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="created" fill="#3b82f6" name="Criadas" />
                <Bar dataKey="completed" fill="#10b981" name="Concluídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Prioridades */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prioridade</CardTitle>
            <CardDescription>Tarefas organizadas por nível de prioridade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Progresso Semanal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progresso Semanal</CardTitle>
            <CardDescription>Taxa de conclusão nas últimas 4 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "rate" ? `${value}%` : value,
                    name === "rate" ? "Taxa de Conclusão" : name === "total" ? "Total" : "Concluídas",
                  ]}
                />
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="rate" />
                <Bar dataKey="total" fill="#e5e7eb" name="total" />
                <Bar dataKey="completed" fill="#10b981" name="completed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Insights de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">🎯 Meta Diária</h4>
              <p className="text-sm text-muted-foreground">
                Você completa em média {(completedTasks / 7).toFixed(1)} tarefas por dia
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">⚡ Velocidade</h4>
              <p className="text-sm text-muted-foreground">
                Tempo médio: {averageCompletionTime.toFixed(1)} dias para conclusão
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">📈 Tendência</h4>
              <p className="text-sm text-muted-foreground">
                {completionRate > 70
                  ? "Excelente produtividade!"
                  : completionRate > 50
                    ? "Boa produtividade"
                    : "Foque em concluir mais tarefas"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
