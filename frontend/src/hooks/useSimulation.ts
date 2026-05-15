import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimulationRequest, SimulationResult, TaskResponse, Transaction, WebSocketMessage } from '@/types/simulation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export interface UseSimulationState {
    isLoading: boolean
    progress: string
    data: SimulationResult | null
    error: string | null
}

export interface UseSimulationActions {
    runSimulation: (balance: number, transactions?: Transaction[]) => Promise<void>
    reset: () => void
}

export function useSimulation(): UseSimulationState & UseSimulationActions {
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState('')
    const [data, setData] = useState<SimulationResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const wsRef = useRef<WebSocket | null>(null)
    const taskIdRef = useRef<string | null>(null)

    // Generate sample transactions for demo purposes
    const generateSampleTransactions = useCallback((): Transaction[] => {
        const now = Date.now()
        return [
            { timestamp: now - 86400000 * 7, amount: -150 },  // 7 days ago, expense
            { timestamp: now - 86400000 * 6, amount: -75 },   // 6 days ago, expense
            { timestamp: now - 86400000 * 5, amount: 500 },   // 5 days ago, income
            { timestamp: now - 86400000 * 4, amount: -200 },  // 4 days ago, expense
            { timestamp: now - 86400000 * 3, amount: -100 },  // 3 days ago, expense
            { timestamp: now - 86400000 * 2, amount: 300 },   // 2 days ago, income
            { timestamp: now - 86400000 * 1, amount: -120 },  // 1 day ago, expense
        ]
    }, [])

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [])

    const connectWebSocket = useCallback((taskId: string) => {
        const ws = new WebSocket(`${WS_URL}/ws/simulation/${taskId}`)
        wsRef.current = ws

        ws.onopen = () => {
            console.log('WebSocket connected')
            setProgress('Conexión establecida...')
        }

        ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data)
                console.log('WebSocket message:', message)

                // Update progress from meta
                if (message.meta?.message) {
                    setProgress(message.meta.message)
                }

                // Handle successful completion
                if (message.state === 'SUCCESS' && message.result) {
                    setData(message.result)
                    setIsLoading(false)
                    setProgress('✅ Simulación completada')
                    ws.close()
                }

                // Handle failure
                if (message.state === 'FAILURE' || message.error) {
                    setError(message.error || 'Error desconocido')
                    setIsLoading(false)
                    setProgress('')
                    ws.close()
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err)
            }
        }

        ws.onerror = (event) => {
            console.error('WebSocket error:', event)
            setError('Error de conexión WebSocket')
            setIsLoading(false)
            setProgress('')
        }

        ws.onclose = () => {
            console.log('WebSocket closed')
        }
    }, [])

    const runSimulation = useCallback(async (balance: number, transactions?: Transaction[]) => {
        try {
            setIsLoading(true)
            setError(null)
            setProgress('Iniciando simulación...')
            setData(null)

            // Use provided transactions or generate sample ones
            const txns = transactions || generateSampleTransactions()

            // Build request payload
            const payload: SimulationRequest = {
                user_id: 'demo_user',
                current_balance: balance,
                transactions: txns,
            }

            console.log('Sending simulation request:', payload)

            // POST to /simulate endpoint
            const response = await fetch(`${API_URL}/simulate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const taskResponse: TaskResponse = await response.json()
            console.log('Task ID:', taskResponse.task_id)

            taskIdRef.current = taskResponse.task_id
            setProgress('Tarea encolada, conectando WebSocket...')

            // Connect to WebSocket for progress updates
            connectWebSocket(taskResponse.task_id)

        } catch (err) {
            console.error('Error running simulation:', err)
            setError(err instanceof Error ? err.message : 'Error desconocido')
            setIsLoading(false)
            setProgress('')
        }
    }, [generateSampleTransactions, connectWebSocket])

    const reset = useCallback(() => {
        setIsLoading(false)
        setProgress('')
        setData(null)
        setError(null)

        if (wsRef.current) {
            wsRef.current.close()
        }

        taskIdRef.current = null
    }, [])

    return {
        isLoading,
        progress,
        data,
        error,
        runSimulation,
        reset,
    }
}
