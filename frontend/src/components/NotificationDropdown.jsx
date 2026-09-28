import { useState, useEffect } from 'react';
import { Dropdown, Badge, Spinner } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function NotificationDropdown() {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!isAuthenticated || !token) return;
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:8000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post('http://localhost:8000/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    
    // Ensure we parse UTC time correctly by appending 'Z' if missing and no offset exists
    const hasTimezone = dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/);
    const safeDateStr = hasTimezone ? dateStr : `${dateStr}Z`;
    
    const diff = new Date() - new Date(safeDateStr);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!isAuthenticated) return null;

  return (
    <Dropdown align="end" className="ms-2">
      <Dropdown.Toggle variant="link" className="text-white p-0 position-relative border-0" id="notification-dropdown">
        <FaBell size={20} />
        {unreadCount > 0 && (
          <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.65rem' }}>
            {unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu variant="dark" style={{ width: '350px', maxHeight: '450px', overflowY: 'auto', backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }} className="shadow-lg p-0">
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'var(--border-subtle)' }}>
          <h6 className="mb-0 fw-bold text-white">Notifications</h6>
          {unreadCount > 0 && (
            <span 
              className="text-primary" 
              style={{ fontSize: '0.8rem', cursor: 'pointer' }}
              onClick={markAllAsRead}
            >
              Mark all as read
            </span>
          )}
        </div>
        
        <div className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="text-center p-4">
              <Spinner animation="border" size="sm" variant="light" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-4 text-muted">
              <small>No notifications yet</small>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-3 border-bottom ${!notif.is_read ? 'bg-primary bg-opacity-10' : ''}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                style={{ cursor: !notif.is_read ? 'pointer' : 'default', borderColor: 'var(--border-subtle)' }}
              >
                <div className="d-flex justify-content-between mb-1">
                  <strong className="text-white" style={{ fontSize: '0.9rem' }}>{notif.title}</strong>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>{getTimeAgo(notif.created_at)}</small>
                </div>
                <p className="mb-1 text-secondary" style={{ fontSize: '0.85rem' }}>{notif.message}</p>
                {notif.link && (
                  <Link 
                    to={notif.link} 
                    className="text-decoration-none" 
                    style={{ fontSize: '0.8rem' }}
                    onClick={(e) => {
                      if (!notif.is_read) markAsRead(notif.id);
                    }}
                  >
                    View details
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
