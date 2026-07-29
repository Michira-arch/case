'use client'

import { useState, useEffect, useRef } from 'react'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions/notifications'
import Link from 'next/link'
import styles from './NotificationsBell.module.css'

export default function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    const res = await getNotifications()
    if (res.notifications) {
      setNotifications(res.notifications)
      setUnreadCount(res.notifications.filter((n: any) => !n.is_read).length)
    }
  }

  async function handleMarkAsRead(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    await markNotificationAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className={styles.icon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={handleMarkAllAsRead}>
                Mark all read
              </button>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`${styles.item} ${n.is_read ? styles.read : styles.unread}`}>
                  <div className={styles.itemContent}>
                    {n.link ? (
                      <Link href={n.link} className={styles.link} onClick={() => !n.is_read && handleMarkAsRead(n.id, { stopPropagation: () => {}, preventDefault: () => {} } as any)}>
                        <h4 className={styles.title}>{n.title}</h4>
                        <p className={styles.text}>{n.content}</p>
                      </Link>
                    ) : (
                      <>
                        <h4 className={styles.title}>{n.title}</h4>
                        <p className={styles.text}>{n.content}</p>
                      </>
                    )}
                    <span className={styles.time}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button 
                      className={styles.markReadBtn} 
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
