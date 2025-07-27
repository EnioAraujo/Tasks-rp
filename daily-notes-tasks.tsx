"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "@/lib/theme-provider"
import { VirtualList } from "@/components/virtual-list"
import { ProductivityDashboard } from "@/components/productivity-dashboard"
import { TaskComments } from "@/components/task-comments"
import { PWAManager, SmartCache } from "@/lib/pwa-utils"
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  StickyNote,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  RotateCcw,
  Bell,
  AlertTriangle,
  Settings,
  BellRing,
  ChevronLeft,
  CalendarDays,
  Sun,
  Moon,
  Monitor,
  BarChart3,
  MessageSquare,
  Share2,
  Wifi,
  WifiOff,
  Download,
} from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"

type Priority = "low" | "medium" | "high"
type TaskStatus = "pending" | "in-progress" | "completed" | "reopened"
type AlertType = "overdue" | "due-today" | "due-soon" | "normal"

interface Comment {
  id: string
  text: string
  author: string
  createdAt: Date
  type: "comment" | "history"
}

interface AlertSettings {
  enabled: boolean
  daysBeforeAlert: number
  showOverdueAlerts: boolean
  showTodayAlerts: boolean
  showUpcomingAlerts: boolean
  browserNotifications: boolean
}

interface SubTask {
  id: string
  text: string
  status: TaskStatus
  priority: Priority
  startDate?: Date
  endDate?: Date
  createdAt: Date
  comments: Comment[]
}

interface Task {
  id: string
  text: string
  status: TaskStatus
  priority: Priority
  startDate?: Date
  endDate?: Date
  createdAt: Date
  completedAt?: Date
  subtasks: SubTask[]
  comments: Comment[]
  sharedWith?: string[]
  projectId?: string
}

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  sharedWith?: string[]
}

interface CalendarTask {
  id: string
  text: string
  status: TaskStatus
  priority: Priority
  isSubtask: boolean
  parentTaskId?: string
}

// Funções para localStorage com cache inteligente
const saveToLocalStorage = async (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    await SmartCache.cacheData(key, data)

    // Adicionar à fila de sincronização se offline
    const pwa = PWAManager.getInstance()
    if (!pwa.isAppOnline()) {
      pwa.addToSyncQueue({ key, data, action: "save" })
    }
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error)
  }
}

const loadFromLocalStorage = async (key: string) => {
  try {
    // Tentar carregar do localStorage primeiro
    const item = localStorage.getItem(key)
    if (item) {
      return JSON.parse(item)
    }

    // Se não encontrar, tentar carregar do cache
    const cachedData = await SmartCache.getCachedData(key)
    return cachedData
  } catch (error) {
    console.error(`Erro ao carregar ${key}:`, error)
    return null
  }
}

// Funções auxiliares para cores e ícones
const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
    case "medium":
      return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300"
    case "low":
      return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
  }
}

const getPriorityBadgeColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white dark:bg-red-600"
    case "medium":
      return "bg-yellow-500 text-white dark:bg-yellow-600"
    case "low":
      return "bg-green-500 text-white dark:bg-green-600"
  }
}

const getPriorityCalendarColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500 border-red-600 dark:bg-red-600 dark:border-red-700"
    case "medium":
      return "bg-yellow-500 border-yellow-600 dark:bg-yellow-600 dark:border-yellow-700"
    case "low":
      return "bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700"
  }
}

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4 text-gray-500" />
    case "in-progress":
      return <PlayCircle className="w-4 h-4 text-blue-500" />
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case "reopened":
      return <RotateCcw className="w-4 h-4 text-orange-500" />
  }
}

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case "pending":
      return "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-700"
    case "in-progress":
      return "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-800"
    case "completed":
      return "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-800"
    case "reopened":
      return "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-800"
  }
}

const formatDate = (date: Date | undefined | null) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ""
  try {
    return date.toLocaleDateString("pt-BR")
  } catch (error) {
    console.error("Error formatting date:", error)
    return ""
  }
}

// Funções para sistema de alertas
const getDaysUntilDue = (endDate: Date | undefined): number => {
  if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
    return Number.POSITIVE_INFINITY
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(endDate)
  dueDate.setHours(0, 0, 0, 0)
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const getAlertType = (task: Task | SubTask, alertSettings: AlertSettings): AlertType => {
  if (task.status === "completed") return "normal"
  if (!task.endDate) return "normal"

  const daysUntilDue = getDaysUntilDue(task.endDate)

  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue === 0) return "due-today"
  if (daysUntilDue <= alertSettings.daysBeforeAlert) return "due-soon"
  return "normal"
}

const getAlertBadge = (alertType: AlertType) => {
  switch (alertType) {
    case "overdue":
      return <Badge className="bg-red-600 text-white text-xs">Vencida</Badge>
    case "due-today":
      return <Badge className="bg-orange-600 text-white text-xs">Vence Hoje</Badge>
    case "due-soon":
      return <Badge className="bg-yellow-600 text-white text-xs">Vence Em Breve</Badge>
    default:
      return null
  }
}

const getAlertColor = (alertType: AlertType, baseColor: string) => {
  switch (alertType) {
    case "overdue":
      return "bg-red-50 border-red-400 border-2 dark:bg-red-900/20 dark:border-red-600"
    case "due-today":
      return "bg-orange-50 border-orange-400 border-2 dark:bg-orange-900/20 dark:border-orange-600"
    case "due-soon":
      return "bg-yellow-50 border-yellow-400 border-2 dark:bg-yellow-900/20 dark:border-yellow-600"
    default:
      return baseColor
  }
}

// Funções para calendário
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay()
}

const isSameDay = (date1: Date, date2: Date) => {
  if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) {
    return false
  }
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

interface TaskItemProps {
  task: Task
  alertSettings: AlertSettings
  expandedTasks: Set<string>
  onToggleExpansion: (taskId: string) => void
  onUpdateStatus: (id: string, newStatus: TaskStatus) => void
  onUpdatePriority: (id: string, newPriority: Priority) => void
  onRemove: (id: string) => void
  onShare: (taskId: string) => void
  onShowComments: (taskId: string | null) => void
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  alertSettings,
  expandedTasks,
  onToggleExpansion,
  onUpdateStatus,
  onUpdatePriority,
  onRemove,
  onShare,
  onShowComments,
}) => {
  const taskAlertType = getAlertType(task, alertSettings)
  const alertBadge = getAlertBadge(taskAlertType)
  const alertColor = getAlertColor(taskAlertType, getStatusColor(task.status))

  return (
    <div key={task.id} className="space-y-3">
      {/* Tarefa Principal */}
      <div className={`p-4 rounded-lg border-2 transition-all ${alertColor} ${getPriorityColor(task.priority)}`}>
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon(task.status)}
            <Badge className={`text-xs ${getPriorityBadgeColor(task.priority)}`}>
              {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
            </Badge>
            {alertBadge}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
              >
                {task.text}
              </span>
              {task.subtasks.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {task.subtasks.filter((st) => st.status === "completed").length}/{task.subtasks.length}
                </Badge>
              )}
            </div>

            {(task.startDate || task.endDate) && (
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {task.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Início: {formatDate(task.startDate)}
                  </div>
                )}
                {task.endDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fim: {formatDate(task.endDate)}
                    {taskAlertType !== "normal" && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        ({getDaysUntilDue(task.endDate) < 0 ? "Vencida" : `${getDaysUntilDue(task.endDate)} dia(s)`})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Select value={task.status} onValueChange={(value: TaskStatus) => onUpdateStatus(task.id, value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendente</SelectItem>
                  <SelectItem value="in-progress">▶️ Em Andamento</SelectItem>
                  <SelectItem value="completed">✅ Concluída</SelectItem>
                  <SelectItem value="reopened">🔄 Reaberta</SelectItem>
                </SelectContent>
              </Select>

              <Select value={task.priority} onValueChange={(value: Priority) => onUpdatePriority(task.id, value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onShowComments(task.id)} className="flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onShare(task.id)} className="flex-shrink-0">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onToggleExpansion(task.id)} className="flex-shrink-0">
              {expandedTasks.has(task.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(task.id)}
              className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Component() {
  const { theme, setTheme } = useTheme()
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [newTask, setNewTask] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium")
  const [newTaskStartDate, setNewTaskStartDate] = useState("")
  const [newTaskEndDate, setNewTaskEndDate] = useState("")
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in-progress" | "completed" | "reopened" | "alerts">(
    "all",
  )
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareTaskId, setShareTaskId] = useState<string | null>(null)

  // Estados para sub-tarefas
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [newSubtasks, setNewSubtasks] = useState<Record<string, string>>({})
  const [newSubtaskPriority, setNewSubtaskPriority] = useState<Record<string, Priority>>({})
  const [newSubtaskStartDate, setNewSubtaskStartDate] = useState<Record<string, string>>({})
  const [newSubtaskEndDate, setNewSubtaskEndDate] = useState<Record<string, string>>({})
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null)
  const [editSubtaskText, setEditSubtaskText] = useState("")

  // Estados para alertas
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enabled: true,
    daysBeforeAlert: 3,
    showOverdueAlerts: true,
    showTodayAlerts: true,
    showUpcomingAlerts: true,
    browserNotifications: false,
  })
  const [showAlertSettings, setShowAlertSettings] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")

  // Estados para calendário
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateTasks, setSelectedDateTasks] = useState<CalendarTask[]>([])
  const [showTaskModal, setShowTaskModal] = useState(false)

  // PWA e conectividade
  useEffect(() => {
    const pwa = PWAManager.getInstance()

    // Initialize PWA with error handling
    pwa.installPWA().catch((error) => {
      console.log("PWA initialization failed:", error)
    })

    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming back online
      pwa.syncPendingData().catch(console.error)
    }
    const handleOffline = () => setIsOnline(false)
    const handleDataSynced = () => {
      loadData().catch(console.error)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("data-synced", handleDataSynced)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("data-synced", handleDataSynced)
    }
  }, [])

  // Add this useEffect after the existing PWA useEffect
  useEffect(() => {
    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_COMPLETE") {
          console.log("Background sync completed")
          loadData() // Reload data after sync
        }
      })
    }
  }, [])

  // Carregar dados
  const loadData = async () => {
    try {
      const savedTasks = await loadFromLocalStorage("daily-tasks")
      const savedNotes = await loadFromLocalStorage("daily-notes")
      const savedAlertSettings = await loadFromLocalStorage("alert-settings")

      if (savedTasks && Array.isArray(savedTasks)) {
        const tasksWithDates = savedTasks
          .map((task: any) => {
            if (!task || typeof task !== "object") return null

            return {
              ...task,
              id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
              startDate: task.startDate ? new Date(task.startDate) : undefined,
              endDate: task.endDate ? new Date(task.endDate) : undefined,
              status: task.status || (task.completed ? "completed" : "pending"),
              priority: task.priority || "medium",
              comments: Array.isArray(task.comments) ? task.comments : [],
              subtasks: Array.isArray(task.subtasks)
                ? task.subtasks
                    .map((subtask: any) => {
                      if (!subtask || typeof subtask !== "object") return null

                      return {
                        ...subtask,
                        id: subtask.id || `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        createdAt: subtask.createdAt ? new Date(subtask.createdAt) : new Date(),
                        startDate: subtask.startDate ? new Date(subtask.startDate) : undefined,
                        endDate: subtask.endDate ? new Date(subtask.endDate) : undefined,
                        status: subtask.status || (subtask.completed ? "completed" : "pending"),
                        priority: subtask.priority || "medium",
                        comments: Array.isArray(subtask.comments) ? subtask.comments : [],
                      }
                    })
                    .filter(Boolean)
                : [],
            }
          })
          .filter(Boolean)

        setTasks(tasksWithDates)
      }

      if (savedNotes && Array.isArray(savedNotes)) {
        const notesWithDates = savedNotes
          .map((note: any) => {
            if (!note || typeof note !== "object") return null

            return {
              ...note,
              id: note.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
              updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
            }
          })
          .filter(Boolean)

        setNotes(notesWithDates)
      }

      if (savedAlertSettings && typeof savedAlertSettings === "object") {
        setAlertSettings({
          enabled: savedAlertSettings.enabled ?? true,
          daysBeforeAlert: Number(savedAlertSettings.daysBeforeAlert) || 3,
          showOverdueAlerts: savedAlertSettings.showOverdueAlerts ?? true,
          showTodayAlerts: savedAlertSettings.showTodayAlerts ?? true,
          showUpcomingAlerts: savedAlertSettings.showUpcomingAlerts ?? true,
          browserNotifications: savedAlertSettings.browserNotifications ?? false,
        })
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoaded(true)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Salvar dados com cache inteligente
  useEffect(() => {
    if (isLoaded) {
      saveToLocalStorage("daily-tasks", tasks)
    }
  }, [tasks, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      saveToLocalStorage("daily-notes", notes)
    }
  }, [notes, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      saveToLocalStorage("alert-settings", alertSettings)
    }
  }, [alertSettings, isLoaded])

  // Verificar permissão de notificação
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Sistema de notificações
  useEffect(() => {
    if (!isLoaded || !alertSettings.enabled || !alertSettings.browserNotifications) return

    const checkAndNotify = () => {
      try {
        const allTasks = tasks.flatMap((task) => [task, ...task.subtasks])
        const alertTasks = allTasks.filter((task) => {
          const alertType = getAlertType(task, alertSettings)
          return alertType !== "normal"
        })

        alertTasks.forEach((task) => {
          const alertType = getAlertType(task, alertSettings)
          if (alertType === "overdue" && alertSettings.showOverdueAlerts) {
            showBrowserNotification(`Tarefa Vencida: ${task.text}`, "Esta tarefa está vencida!")
          } else if (alertType === "due-today" && alertSettings.showTodayAlerts) {
            showBrowserNotification(`Tarefa Vence Hoje: ${task.text}`, "Esta tarefa vence hoje!")
          } else if (alertType === "due-soon" && alertSettings.showUpcomingAlerts) {
            const days = getDaysUntilDue(task.endDate)
            showBrowserNotification(`Tarefa Vence Em Breve: ${task.text}`, `Esta tarefa vence em ${days} dias.`)
          }
        })
      } catch (error) {
        console.error("Error in notification check:", error)
      }
    }

    const interval = setInterval(checkAndNotify, 60000)
    return () => clearInterval(interval)
  }, [tasks, alertSettings, isLoaded])

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === "granted") {
        setAlertSettings((prev) => ({ ...prev, browserNotifications: true }))
      }
    }
  }

  const showBrowserNotification = (title: string, body: string) => {
    if (notificationPermission === "granted" && "Notification" in window) {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "task-alert",
      })
    }
  }

  // Funções para comentários
  const addComment = (taskId: string, comment: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      text: comment,
      author: "Usuário", // Em uma implementação real, seria o usuário logado
      createdAt: new Date(),
      type: "comment",
    }

    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, comments: [...task.comments, newComment] }
        }
        return {
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask.id === taskId ? { ...subtask, comments: [...subtask.comments, newComment] } : subtask,
          ),
        }
      }),
    )
  }

  const addHistoryEntry = (taskId: string, action: string) => {
    const historyEntry: Comment = {
      id: Date.now().toString(),
      text: action,
      author: "Sistema",
      createdAt: new Date(),
      type: "history",
    }

    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, comments: [...task.comments, historyEntry] }
        }
        return {
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask.id === taskId ? { ...subtask, comments: [...subtask.comments, historyEntry] } : subtask,
          ),
        }
      }),
    )
  }

  // Funções para compartilhamento
  const shareTask = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) {
        console.error("Task not found for sharing:", taskId)
        return
      }

      if (navigator.share) {
        await navigator.share({
          title: `Tarefa: ${task.text}`,
          text: `Confira esta tarefa: ${task.text}`,
          url: window.location.href,
        })
      } else {
        // Fallback para navegadores sem suporte ao Web Share API
        const shareUrl = `${window.location.href}?task=${taskId}`
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl)
          alert("Link copiado para a área de transferência!")
        } else {
          console.warn("Clipboard API not available")
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error sharing task:", error)
      }
    }
  }

  // Funções para calendário
  const getTasksForDate = (date: Date): CalendarTask[] => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime()) || !Array.isArray(tasks)) {
      return []
    }

    const tasksForDate: CalendarTask[] = []

    tasks.forEach((task) => {
      if (!task || !task.id) return

      if (task.endDate && isSameDay(task.endDate, date)) {
        tasksForDate.push({
          id: task.id,
          text: task.text || "",
          status: task.status || "pending",
          priority: task.priority || "medium",
          isSubtask: false,
        })
      }

      if (Array.isArray(task.subtasks)) {
        task.subtasks.forEach((subtask) => {
          if (!subtask || !subtask.id) return

          if (subtask.endDate && isSameDay(subtask.endDate, date)) {
            tasksForDate.push({
              id: subtask.id,
              text: subtask.text || "",
              status: subtask.status || "pending",
              priority: subtask.priority || "medium",
              isSubtask: true,
              parentTaskId: task.id,
            })
          }
        })
      }
    })

    return tasksForDate
  }

  const handleDateClick = (date: Date) => {
    const tasksForDate = getTasksForDate(date)
    setSelectedDate(date)
    setSelectedDateTasks(tasksForDate)
    setShowTaskModal(true)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const today = new Date()

    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const tasksForDate = getTasksForDate(date)
      const isToday = isSameDay(date, today)

      days.push(
        <div
          key={day}
          className={`h-24 md:h-32 border border-gray-200 dark:border-gray-700 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            isToday ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600" : ""
          }`}
          onClick={() => handleDateClick(date)}
        >
          <div
            className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
          >
            {day}
          </div>
          <div className="space-y-1 overflow-hidden">
            {tasksForDate.slice(0, 3).map((task, index) => (
              <div
                key={`${task.id}-${index}`}
                className={`text-xs p-1 rounded border truncate ${getPriorityCalendarColor(task.priority)} ${
                  task.status === "completed" ? "opacity-60 line-through" : "text-white"
                }`}
                title={task.text}
              >
                {task.isSubtask ? "↳ " : ""}
                {task.text}
              </div>
            ))}
            {tasksForDate.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                +{tasksForDate.length - 3} mais
              </div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  // Funções para tarefas principais (atualizadas com histórico)
  const addTask = () => {
    if (newTask.trim() !== "") {
      const task: Task = {
        id: Date.now().toString(),
        text: newTask.trim(),
        status: "pending",
        priority: newTaskPriority,
        startDate: newTaskStartDate ? new Date(newTaskStartDate) : undefined,
        endDate: newTaskEndDate ? new Date(newTaskEndDate) : undefined,
        createdAt: new Date(),
        subtasks: [],
        comments: [],
      }
      setTasks([task, ...tasks])
      setNewTask("")
      setNewTaskPriority("medium")
      setNewTaskStartDate("")
      setNewTaskEndDate("")
      setShowNewTaskForm(false)
    }
  }

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          const updatedTask = {
            ...task,
            status: newStatus,
            completedAt: newStatus === "completed" ? new Date() : undefined,
            subtasks:
              newStatus === "completed"
                ? task.subtasks.map((subtask) => ({
                    ...subtask,
                    status: "completed" as TaskStatus,
                    completedAt: new Date(),
                  }))
                : task.subtasks,
          }

          // Adicionar entrada no histórico
          addHistoryEntry(
            id,
            `Status alterado para: ${
              newStatus === "pending"
                ? "Pendente"
                : newStatus === "in-progress"
                  ? "Em Andamento"
                  : newStatus === "completed"
                    ? "Concluída"
                    : "Reaberta"
            }`,
          )

          return updatedTask
        }
        return task
      }),
    )
  }

  const updateTaskPriority = (id: string, newPriority: Priority) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          addHistoryEntry(
            id,
            `Prioridade alterada para: ${
              newPriority === "high" ? "Alta" : newPriority === "medium" ? "Média" : "Baixa"
            }`,
          )
          return { ...task, priority: newPriority }
        }
        return task
      }),
    )
  }

  const removeTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
    setExpandedTasks((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    setNewSubtasks((prev) => {
      const newSubtasks = { ...prev }
      delete newSubtasks[id]
      return newSubtasks
    })
  }

  // Funções para sub-tarefas (atualizadas com histórico)
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const addSubtask = (taskId: string) => {
    const subtaskText = newSubtasks[taskId]?.trim()
    if (!subtaskText) return

    try {
      const subtask: SubTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID mais único
        text: subtaskText,
        status: "pending",
        priority: newSubtaskPriority[taskId] || "medium",
        startDate: newSubtaskStartDate[taskId] ? new Date(newSubtaskStartDate[taskId]) : undefined,
        endDate: newSubtaskEndDate[taskId] ? new Date(newSubtaskEndDate[taskId]) : undefined,
        createdAt: new Date(),
        comments: [],
      }

      setTasks(
        tasks.map((task) => {
          if (task.id === taskId) {
            addHistoryEntry(taskId, `Sub-tarefa adicionada: ${subtaskText}`)
            return { ...task, subtasks: [...task.subtasks, subtask] }
          }
          return task
        }),
      )

      setNewSubtasks((prev) => ({ ...prev, [taskId]: "" }))
      setNewSubtaskPriority((prev) => ({ ...prev, [taskId]: "medium" }))
      setNewSubtaskStartDate((prev) => ({ ...prev, [taskId]: "" }))
      setNewSubtaskEndDate((prev) => ({ ...prev, [taskId]: "" }))
    } catch (error) {
      console.error("Error adding subtask:", error)
    }
  }

  const updateSubtaskStatus = (taskId: string, subtaskId: string, newStatus: TaskStatus) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((subtask) =>
            subtask.id === subtaskId
              ? {
                  ...subtask,
                  status: newStatus,
                  completedAt: newStatus === "completed" ? new Date() : undefined,
                }
              : subtask,
          )

          const allSubtasksCompleted =
            updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.status === "completed")
          const hasInProgressSubtasks = updatedSubtasks.some((st) => st.status === "in-progress")

          let taskStatus = task.status
          if (allSubtasksCompleted && updatedSubtasks.length > 0) {
            taskStatus = "completed"
          } else if (hasInProgressSubtasks && task.status === "pending") {
            taskStatus = "in-progress"
          }

          // Adicionar entrada no histórico da sub-tarefa
          addHistoryEntry(
            subtaskId,
            `Status da sub-tarefa alterado para: ${
              newStatus === "pending"
                ? "Pendente"
                : newStatus === "in-progress"
                  ? "Em Andamento"
                  : newStatus === "completed"
                    ? "Concluída"
                    : "Reaberta"
            }`,
          )

          return {
            ...task,
            subtasks: updatedSubtasks,
            status: taskStatus,
            completedAt: taskStatus === "completed" ? new Date() : task.completedAt,
          }
        }
        return task
      }),
    )
  }

  const updateSubtaskPriority = (taskId: string, subtaskId: string, newPriority: Priority) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) => {
                if (subtask.id === subtaskId) {
                  addHistoryEntry(
                    subtaskId,
                    `Prioridade da sub-tarefa alterada para: ${
                      newPriority === "high" ? "Alta" : newPriority === "medium" ? "Média" : "Baixa"
                    }`,
                  )
                  return { ...subtask, priority: newPriority }
                }
                return subtask
              }),
            }
          : task,
      ),
    )
  }

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const subtaskToRemove = task.subtasks.find((st) => st.id === subtaskId)
          if (subtaskToRemove) {
            addHistoryEntry(taskId, `Sub-tarefa removida: ${subtaskToRemove.text}`)
          }
          return { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId) }
        }
        return task
      }),
    )
  }

  const startEditSubtask = (subtaskId: string, currentText: string) => {
    setEditingSubtask(subtaskId)
    setEditSubtaskText(currentText)
  }

  const saveEditSubtask = (taskId: string, subtaskId: string) => {
    if (editSubtaskText.trim()) {
      setTasks(
        tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks.map((subtask) => {
                  if (subtask.id === subtaskId) {
                    addHistoryEntry(subtaskId, `Sub-tarefa editada: ${editSubtaskText.trim()}`)
                    return { ...subtask, text: editSubtaskText.trim() }
                  }
                  return subtask
                }),
              }
            : task,
        ),
      )
      setEditingSubtask(null)
      setEditSubtaskText("")
    }
  }

  const cancelEditSubtask = () => {
    setEditingSubtask(null)
    setEditSubtaskText("")
  }

  const getFilteredTasks = () => {
    if (taskFilter === "all") return tasks
    if (taskFilter === "alerts") {
      return tasks.filter((task) => {
        const taskAlertType = getAlertType(task, alertSettings)
        const hasAlertSubtasks = task.subtasks.some((subtask) => getAlertType(subtask, alertSettings) !== "normal")
        return taskAlertType !== "normal" || hasAlertSubtasks
      })
    }
    return tasks.filter((task) => task.status === taskFilter)
  }

  // Funções para anotações
  const addNote = () => {
    if (newNoteTitle.trim() !== "" && newNoteContent.trim() !== "") {
      const note: Note = {
        id: Date.now().toString(),
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setNotes([note, ...notes])
      setNewNoteTitle("")
      setNewNoteContent("")
    }
  }

  const startEditNote = (note: Note) => {
    setEditingNote(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  const saveEditNote = () => {
    if (editTitle.trim() !== "" && editContent.trim() !== "") {
      setNotes(
        notes.map((note) =>
          note.id === editingNote
            ? { ...note, title: editTitle.trim(), content: editContent.trim(), updatedAt: new Date() }
            : note,
        ),
      )
      setEditingNote(null)
      setEditTitle("")
      setEditContent("")
    }
  }

  const cancelEditNote = () => {
    setEditingNote(null)
    setEditTitle("")
    setEditContent("")
  }

  const removeNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id))
  }

  const getTaskCounts = () => {
    const alertTasks = tasks.filter((task) => {
      const taskAlertType = getAlertType(task, alertSettings)
      const hasAlertSubtasks = task.subtasks.some((subtask) => getAlertType(subtask, alertSettings) !== "normal")
      return taskAlertType !== "normal" || hasAlertSubtasks
    })

    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      reopened: tasks.filter((t) => t.status === "reopened").length,
      alerts: alertTasks.length,
    }
  }

  // Virtual scroll para listas grandes
  const filteredTasks = getFilteredTasks()
  const useVirtualScroll = filteredTasks.length > 50

  const taskCounts = getTaskCounts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header com controles de tema e status de conectividade */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
              <span className="text-sm text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
              >
                {theme === "light" && <Sun className="h-4 w-4" />}
                {theme === "dark" && <Moon className="h-4 w-4" />}
                {theme === "system" && <Monitor className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Check if app can be installed
                  if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.ready
                      .then(() => {
                        // Show install prompt or confirmation
                        if (window.confirm("Instalar TaskNotes como aplicativo?")) {
                          // In a real implementation, you'd trigger the install prompt
                          alert("App pode ser instalado através do menu do navegador!")
                        }
                      })
                      .catch(() => {
                        alert("PWA não disponível neste ambiente")
                      })
                  } else {
                    alert("PWA não suportado neste navegador")
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sistema de Anotações e Tarefas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organize seu dia com tarefas, sub-tarefas, prioridades e calendário
          </p>

          {!isLoaded && (
            <div className="mt-4">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 dark:border-blue-300 mr-2"></div>
                Carregando seus dados...
              </div>
            </div>
          )}
        </div>

        {/* Painel de Alertas */}
        {isLoaded && alertSettings.enabled && taskCounts.alerts > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-300">
              <div className="flex items-center justify-between">
                <span>
                  <strong>Atenção!</strong> Você tem {taskCounts.alerts} tarefa(s) com prazos próximos ou vencidos.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTaskFilter("alerts")}
                  className="text-orange-800 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-900/20"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Ver Alertas
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLoaded && (
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Tarefas
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {taskCounts.pending + taskCounts.inProgress + taskCounts.reopened}
                  </Badge>
                )}
                {taskCounts.alerts > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white">
                    <Bell className="w-3 h-3 mr-1" />
                    {taskCounts.alerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Anotações
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Aba de Dashboard */}
            <TabsContent value="dashboard" className="space-y-6">
              <ProductivityDashboard tasks={tasks} />
            </TabsContent>

            {/* Aba do Calendário */}
            <TabsContent value="calendar" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      Calendário de Tarefas
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={goToToday}>
                        Hoje
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="font-medium text-lg px-4">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Visualize suas tarefas organizadas por data de vencimento. Clique em um dia para ver detalhes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Legenda */}
                  <div className="mb-4 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>Alta Prioridade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>Média Prioridade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>Baixa Prioridade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>↳</span>
                      <span>Sub-tarefa</span>
                    </div>
                  </div>

                  {/* Cabeçalho dos dias da semana */}
                  <div className="grid grid-cols-7 gap-0 mb-2">
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="p-2 text-center font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Grid do calendário */}
                  <div className="grid grid-cols-7 gap-0 border border-gray-200 dark:border-gray-700">
                    {renderCalendar()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Modal de detalhes da data */}
            <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Tarefas para {selectedDate && formatDate(selectedDate)}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedDateTasks.length === 0
                      ? "Nenhuma tarefa para esta data."
                      : `${selectedDateTasks.length} tarefa(s) encontrada(s).`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {selectedDateTasks.map((task) => {
                    const fullTask = tasks.find((t) => t.id === task.id || t.subtasks.some((st) => st.id === task.id))
                    const isSubtask = task.isSubtask
                    const parentTask = isSubtask ? tasks.find((t) => t.id === task.parentTaskId) : null

                    return (
                      <Card key={task.id} className={`${getPriorityColor(task.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <Badge className={`text-xs ${getPriorityBadgeColor(task.priority)}`}>
                                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                              </Badge>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`font-medium ${
                                    task.status === "completed"
                                      ? "line-through text-gray-500"
                                      : "text-gray-900 dark:text-gray-100"
                                  }`}
                                >
                                  {isSubtask ? "↳ " : ""}
                                  {task.text}
                                </span>
                              </div>

                              {isSubtask && parentTask && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  <span className="font-medium">Tarefa principal:</span> {parentTask.text}
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Status:</span>
                                  {task.status === "pending" && "Pendente"}
                                  {task.status === "in-progress" && "Em Andamento"}
                                  {task.status === "completed" && "Concluída"}
                                  {task.status === "reopened" && "Reaberta"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>

            {/* Aba de Tarefas */}
            <TabsContent value="tasks" className="space-y-6">
              {/* Configurações de Alerta */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      <CardTitle>Configurações de Alertas</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowAlertSettings(!showAlertSettings)}>
                      {showAlertSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <Collapsible open={showAlertSettings}>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="alerts-enabled">Alertas habilitados</Label>
                          <Switch
                            id="alerts-enabled"
                            checked={alertSettings.enabled}
                            onCheckedChange={(checked) => setAlertSettings((prev) => ({ ...prev, enabled: checked }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Alertar quantos dias antes?</Label>
                          <Select
                            value={alertSettings?.daysBeforeAlert?.toString() || "3"}
                            onValueChange={(value) =>
                              setAlertSettings((prev) => ({ ...prev, daysBeforeAlert: Number.parseInt(value) || 3 }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 dia antes</SelectItem>
                              <SelectItem value="2">2 dias antes</SelectItem>
                              <SelectItem value="3">3 dias antes</SelectItem>
                              <SelectItem value="7">1 semana antes</SelectItem>
                              <SelectItem value="14">2 semanas antes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="overdue-alerts">Alertas para vencidas</Label>
                          <Switch
                            id="overdue-alerts"
                            checked={alertSettings.showOverdueAlerts}
                            onCheckedChange={(checked) =>
                              setAlertSettings((prev) => ({ ...prev, showOverdueAlerts: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="today-alerts">Alertas para hoje</Label>
                          <Switch
                            id="today-alerts"
                            checked={alertSettings.showTodayAlerts}
                            onCheckedChange={(checked) =>
                              setAlertSettings((prev) => ({ ...prev, showTodayAlerts: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="upcoming-alerts">Alertas próximos</Label>
                          <Switch
                            id="upcoming-alerts"
                            checked={alertSettings.showUpcomingAlerts}
                            onCheckedChange={(checked) =>
                              setAlertSettings((prev) => ({ ...prev, showUpcomingAlerts: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="browser-notifications">Notificações do navegador</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="browser-notifications"
                              checked={alertSettings.browserNotifications}
                              onCheckedChange={(checked) =>
                                setAlertSettings((prev) => ({ ...prev, browserNotifications: checked }))
                              }
                              disabled={notificationPermission !== "granted"}
                            />
                            {notificationPermission !== "granted" && (
                              <Button size="sm" onClick={requestNotificationPermission}>
                                <BellRing className="w-4 h-4 mr-1" />
                                Permitir
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Formulário para Nova Tarefa - Recolhível */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Nova Tarefa
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
                      {showNewTaskForm ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                  {!showNewTaskForm && <CardDescription>Clique para adicionar uma nova tarefa</CardDescription>}
                </CardHeader>
                <Collapsible open={showNewTaskForm}>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite sua tarefa..."
                          value={newTask}
                          onChange={(e) => setNewTask(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTask()}
                          className="flex-1"
                        />
                        <Button onClick={addTask} disabled={!newTask.trim()}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Prioridade</Label>
                          <Select
                            value={newTaskPriority}
                            onValueChange={(value: Priority) => setNewTaskPriority(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">🟢 Baixa</SelectItem>
                              <SelectItem value="medium">🟡 Média</SelectItem>
                              <SelectItem value="high">🔴 Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Início</Label>
                          <Input
                            type="date"
                            value={newTaskStartDate}
                            onChange={(e) => setNewTaskStartDate(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Término</Label>
                          <Input
                            type="date"
                            value={newTaskEndDate}
                            onChange={(e) => setNewTaskEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Lista de Tarefas com Virtual Scroll */}
              {tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Suas Tarefas</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={taskFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("all")}
                        >
                          Todas ({taskCounts.all})
                        </Button>
                        <Button
                          variant={taskFilter === "alerts" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("alerts")}
                          className={
                            taskCounts.alerts > 0
                              ? "text-red-600 border-red-300 dark:text-red-400 dark:border-red-600"
                              : ""
                          }
                        >
                          <Bell className="w-4 h-4 mr-1" />
                          Alertas ({taskCounts.alerts})
                        </Button>
                        <Button
                          variant={taskFilter === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("pending")}
                        >
                          Pendentes ({taskCounts.pending})
                        </Button>
                        <Button
                          variant={taskFilter === "in-progress" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("in-progress")}
                        >
                          Em Andamento ({taskCounts.inProgress})
                        </Button>
                        <Button
                          variant={taskFilter === "completed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("completed")}
                        >
                          Concluídas ({taskCounts.completed})
                        </Button>
                        <Button
                          variant={taskFilter === "reopened" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskFilter("reopened")}
                        >
                          Reabertas ({taskCounts.reopened})
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {useVirtualScroll ? (
                      <VirtualList
                        items={filteredTasks}
                        itemHeight={200}
                        containerHeight={600}
                        renderItem={(task, index) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            alertSettings={alertSettings}
                            expandedTasks={expandedTasks}
                            onToggleExpansion={toggleTaskExpansion}
                            onUpdateStatus={updateTaskStatus}
                            onUpdatePriority={updateTaskPriority}
                            onRemove={removeTask}
                            onShare={shareTask}
                            onShowComments={setSelectedTaskForComments}
                          />
                        )}
                      />
                    ) : (
                      <div className="space-y-4">
                        {filteredTasks.map((task) => {
                          const taskAlertType = getAlertType(task, alertSettings)
                          const alertBadge = getAlertBadge(taskAlertType)
                          const alertColor = getAlertColor(taskAlertType, getStatusColor(task.status))

                          return (
                            <div key={task.id} className="space-y-3">
                              {/* Tarefa Principal */}
                              <div
                                className={`p-4 rounded-lg border-2 transition-all ${alertColor} ${getPriorityColor(task.priority)}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStatusIcon(task.status)}
                                    <Badge className={`text-xs ${getPriorityBadgeColor(task.priority)}`}>
                                      {task.priority === "high"
                                        ? "Alta"
                                        : task.priority === "medium"
                                          ? "Média"
                                          : "Baixa"}
                                    </Badge>
                                    {alertBadge}
                                  </div>

                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
                                      >
                                        {task.text}
                                      </span>
                                      {task.subtasks.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {task.subtasks.filter((st) => st.status === "completed").length}/
                                          {task.subtasks.length}
                                        </Badge>
                                      )}
                                    </div>

                                    {(task.startDate || task.endDate) && (
                                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        {task.startDate && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Início: {formatDate(task.startDate)}
                                          </div>
                                        )}
                                        {task.endDate && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Fim: {formatDate(task.endDate)}
                                            {taskAlertType !== "normal" && (
                                              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                (
                                                {getDaysUntilDue(task.endDate) < 0
                                                  ? "Vencida"
                                                  : `${getDaysUntilDue(task.endDate)} dia(s)`}
                                                )
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={task.status}
                                        onValueChange={(value: TaskStatus) => updateTaskStatus(task.id, value)}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">⏳ Pendente</SelectItem>
                                          <SelectItem value="in-progress">▶️ Em Andamento</SelectItem>
                                          <SelectItem value="completed">✅ Concluída</SelectItem>
                                          <SelectItem value="reopened">🔄 Reaberta</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <Select
                                        value={task.priority}
                                        onValueChange={(value: Priority) => updateTaskPriority(task.id, value)}
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="low">🟢 Baixa</SelectItem>
                                          <SelectItem value="medium">🟡 Média</SelectItem>
                                          <SelectItem value="high">🔴 Alta</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedTaskForComments(task.id)}
                                      className="flex-shrink-0"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => shareTask(task.id)}
                                      className="flex-shrink-0"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleTaskExpansion(task.id)}
                                      className="flex-shrink-0"
                                    >
                                      {expandedTasks.has(task.id) ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTask(task.id)}
                                      className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Sub-tarefas */}
                              <Collapsible open={expandedTasks.has(task.id)}>
                                <CollapsibleContent className="ml-8 space-y-3">
                                  {/* Formulário para nova sub-tarefa */}
                                  <Card className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex gap-2">
                                        <Input
                                          placeholder="Adicionar sub-tarefa..."
                                          value={newSubtasks[task.id] || ""}
                                          onChange={(e) =>
                                            setNewSubtasks((prev) => ({ ...prev, [task.id]: e.target.value }))
                                          }
                                          onKeyDown={(e) => e.key === "Enter" && addSubtask(task.id)}
                                          className="flex-1 text-sm"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => addSubtask(task.id)}
                                          disabled={!newSubtasks[task.id]?.trim()}
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <Select
                                          value={newSubtaskPriority[task.id] || "medium"}
                                          onValueChange={(value: Priority) =>
                                            setNewSubtaskPriority((prev) => ({ ...prev, [task.id]: value }))
                                          }
                                        >
                                          <SelectTrigger className="text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="low">🟢 Baixa</SelectItem>
                                            <SelectItem value="medium">🟡 Média</SelectItem>
                                            <SelectItem value="high">🔴 Alta</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Input
                                          type="date"
                                          value={newSubtaskStartDate[task.id] || ""}
                                          onChange={(e) =>
                                            setNewSubtaskStartDate((prev) => ({ ...prev, [task.id]: e.target.value }))
                                          }
                                          className="text-sm"
                                        />

                                        <Input
                                          type="date"
                                          value={newSubtaskEndDate[task.id] || ""}
                                          onChange={(e) =>
                                            setNewSubtaskEndDate((prev) => ({ ...prev, [task.id]: e.target.value }))
                                          }
                                          className="text-sm"
                                        />
                                      </div>
                                    </div>
                                  </Card>

                                  {/* Lista de sub-tarefas */}
                                  {task.subtasks.map((subtask) => {
                                    const subtaskAlertType = getAlertType(subtask, alertSettings)
                                    const subtaskAlertBadge = getAlertBadge(subtaskAlertType)
                                    const subtaskAlertColor = getAlertColor(
                                      subtaskAlertType,
                                      getStatusColor(subtask.status),
                                    )

                                    return (
                                      <div
                                        key={subtask.id}
                                        className={`p-3 rounded border-l-4 transition-all ${subtaskAlertColor} ${getPriorityColor(subtask.priority)}`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="flex items-center gap-2 mt-1">
                                            {getStatusIcon(subtask.status)}
                                            <Badge className={`text-xs ${getPriorityBadgeColor(subtask.priority)}`}>
                                              {subtask.priority === "high"
                                                ? "Alta"
                                                : subtask.priority === "medium"
                                                  ? "Média"
                                                  : "Baixa"}
                                            </Badge>
                                            {subtaskAlertBadge}
                                          </div>

                                          {editingSubtask === subtask.id ? (
                                            <div className="flex-1 flex gap-2">
                                              <Input
                                                value={editSubtaskText}
                                                onChange={(e) => setEditSubtaskText(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") saveEditSubtask(task.id, subtask.id)
                                                  if (e.key === "Escape") cancelEditSubtask()
                                                }}
                                                className="text-sm"
                                                autoFocus
                                              />
                                              <Button
                                                size="sm"
                                                onClick={() => saveEditSubtask(task.id, subtask.id)}
                                                disabled={!editSubtaskText.trim()}
                                              >
                                                <Save className="w-3 h-3" />
                                              </Button>
                                              <Button size="sm" variant="outline" onClick={cancelEditSubtask}>
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex-1 space-y-2">
                                              <span
                                                className={`text-sm ${
                                                  subtask.status === "completed"
                                                    ? "line-through text-gray-500"
                                                    : "text-gray-700 dark:text-gray-300"
                                                }`}
                                              >
                                                {subtask.text}
                                              </span>

                                              {(subtask.startDate || subtask.endDate) && (
                                                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                                  {subtask.startDate && (
                                                    <div className="flex items-center gap-1">
                                                      <Calendar className="w-3 h-3" />
                                                      {formatDate(subtask.startDate)}
                                                    </div>
                                                  )}
                                                  {subtask.endDate && (
                                                    <div className="flex items-center gap-1">
                                                      <Calendar className="w-3 h-3" />
                                                      {formatDate(subtask.endDate)}
                                                      {subtaskAlertType !== "normal" && (
                                                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                          (
                                                          {getDaysUntilDue(subtask.endDate) < 0
                                                            ? "Vencida"
                                                            : `${getDaysUntilDue(subtask.endDate)} dia(s)`}
                                                          )
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              <div className="flex items-center gap-2">
                                                <Select
                                                  value={subtask.status}
                                                  onValueChange={(value: TaskStatus) =>
                                                    updateSubtaskStatus(task.id, subtask.id, value)
                                                  }
                                                >
                                                  <SelectTrigger className="w-36 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="pending">⏳ Pendente</SelectItem>
                                                    <SelectItem value="in-progress">▶️ Em Andamento</SelectItem>
                                                    <SelectItem value="completed">✅ Concluída</SelectItem>
                                                    <SelectItem value="reopened">🔄 Reaberta</SelectItem>
                                                  </SelectContent>
                                                </Select>

                                                <Select
                                                  value={subtask.priority}
                                                  onValueChange={(value: Priority) =>
                                                    updateSubtaskPriority(task.id, subtask.id, value)
                                                  }
                                                >
                                                  <SelectTrigger className="w-28 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="low">🟢 Baixa</SelectItem>
                                                    <SelectItem value="medium">🟡 Média</SelectItem>
                                                    <SelectItem value="high">🔴 Alta</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>
                                          )}

                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setSelectedTaskForComments(subtask.id)}
                                              className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            >
                                              <MessageSquare className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => startEditSubtask(subtask.id, subtask.text)}
                                              className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeSubtask(task.id, subtask.id)}
                                              className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Modal de Comentários */}
            <Dialog open={!!selectedTaskForComments} onOpenChange={() => setSelectedTaskForComments(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                {selectedTaskForComments && (
                  <TaskComments
                    taskId={selectedTaskForComments}
                    comments={
                      tasks.find((t) => t.id === selectedTaskForComments)?.comments ||
                      tasks.flatMap((t) => t.subtasks).find((st) => st.id === selectedTaskForComments)?.comments ||
                      []
                    }
                    onAddComment={addComment}
                  />
                )}
              </DialogContent>
            </Dialog>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Nova Anotação
                  </CardTitle>
                  <CardDescription>Crie uma nova anotação para suas ideias e lembretes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Título da anotação..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Conteúdo da anotação..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={addNote}
                    disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Salvar Anotação
                  </Button>
                </CardContent>
              </Card>

              {notes.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {notes.map((note) => (
                    <Card key={note.id} className="h-fit">
                      <CardHeader className="pb-3">
                        {editingNote === note.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="font-semibold"
                          />
                        ) : (
                          <CardTitle className="text-lg">{note.title}</CardTitle>
                        )}
                        <CardDescription>
                          Criado em {note.createdAt.toLocaleDateString("pt-BR")}
                          {note.updatedAt > note.createdAt && (
                            <span> • Editado em {note.updatedAt.toLocaleDateString("pt-BR")}</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {editingNote === note.id ? (
                          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} />
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                        )}

                        <Separator />

                        <div className="flex gap-2">
                          {editingNote === note.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={saveEditNote}
                                disabled={!editTitle.trim() || !editContent.trim()}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditNote}>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditNote(note)}>
                                <Edit3 className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeNote(note.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Excluir
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <InstallPrompt />
    </div>
  )
}
