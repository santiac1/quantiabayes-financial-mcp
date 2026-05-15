// TypeScript types for backend API responses

export interface Transaction {
    timestamp: number
    amount: number
}

export interface ForecastPoint {
    day: number
    mean: number
    lower: number
    upper: number
}

export interface SimulationResult {
    forecast_data: ForecastPoint[]
    recommended_action: string
}

export interface SimulationRequest {
    user_id: string
    transactions: Transaction[]
    current_balance: number
}

export interface TaskResponse {
    task_id: string
}

export interface WebSocketMessage {
    state: string
    meta?: {
        message?: string
        progress?: string
    }
    result?: SimulationResult
    error?: string
}
