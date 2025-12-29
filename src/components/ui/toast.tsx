import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertCircle, CreditCard, X } from "lucide-react"

interface ToastProps {
    message: string
    type?: 'success' | 'error' | 'payment'
    isOpen: boolean
    onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', isOpen, onClose }) => {
    React.useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose()
            }, 4000)
            return () => clearTimeout(timer)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const iconMap = {
        success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        error: <AlertCircle className="h-6 w-6 text-red-500" />,
        payment: <CreditCard className="h-6 w-6 text-blue-500" />
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={cn(
                "relative bg-background border rounded-lg shadow-lg p-6 max-w-sm w-full",
                "animate-in fade-in-0 zoom-in-95"
            )}>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="flex flex-col items-center text-center gap-4">
                    {iconMap[type]}
                    <p className="text-sm">{message}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

// Global toast state management
type ToastState = {
    isOpen: boolean
    message: string
    type: 'success' | 'error' | 'payment'
}

let toastListener: ((state: ToastState) => void) | null = null

export const showToast = (message: string, type: 'success' | 'error' | 'payment' = 'success') => {
    if (toastListener) {
        toastListener({ isOpen: true, message, type })
    }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = React.useState<ToastState>({
        isOpen: false,
        message: '',
        type: 'success'
    })

    React.useEffect(() => {
        toastListener = setState
        return () => {
            toastListener = null
        }
    }, [])

    return (
        <>
            {children}
            <Toast
                isOpen={state.isOpen}
                message={state.message}
                type={state.type}
                onClose={() => setState(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    )
}
