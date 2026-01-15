'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
    description?: string
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, description?: string) => void
    success: (message: string, description?: string) => void
    error: (message: string, description?: string) => void
    info: (message: string, description?: string) => void
    warning: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
}

const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((message: string, type: ToastType = 'info', description?: string) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, message, type, description }])

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 5000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const contextValue: ToastContextType = {
        toast: addToast,
        success: (msg, desc) => addToast(msg, 'success', desc),
        error: (msg, desc) => addToast(msg, 'error', desc),
        info: (msg, desc) => addToast(msg, 'info', desc),
        warning: (msg, desc) => addToast(msg, 'warning', desc),
    }

    return (
        <ToastContext.Provider value={contextValue}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}

                {toasts.map((toast) => {
                    const Icon = icons[toast.type]
                    return (
                        <ToastPrimitive.Root
                            key={toast.id}
                            className={`
                ${styles[toast.type]}
                border rounded-lg shadow-lg p-4 pr-8
                data-[state=open]:animate-in data-[state=open]:slide-in-from-right
                data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right
                data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
                data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform
                data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right
              `}
                            onOpenChange={(open) => !open && removeToast(toast.id)}
                        >
                            <div className="flex items-start gap-3">
                                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[toast.type]}`} />
                                <div className="flex-1 min-w-0">
                                    <ToastPrimitive.Title className="font-medium text-sm">
                                        {toast.message}
                                    </ToastPrimitive.Title>
                                    {toast.description && (
                                        <ToastPrimitive.Description className="text-sm opacity-80 mt-1">
                                            {toast.description}
                                        </ToastPrimitive.Description>
                                    )}
                                </div>
                            </div>
                            <ToastPrimitive.Close className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors">
                                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                            </ToastPrimitive.Close>
                        </ToastPrimitive.Root>
                    )
                })}

                <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)] outline-none" />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    )
}
