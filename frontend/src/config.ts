// Merkezi runtime konfigürasyonu.
// Production'da derleme anında VITE_API_URL ayarla (ör. https://vormpixyze.com).
// Ayarlanmazsa lokal backend dev portuna düşer
// (bkz. backend/Properties/launchSettings.json -> http://localhost:5289).
const rawBase = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5289';

// Sondaki '/' karakterini temizle ki birleştirmelerde çift slash olmasın.
export const API_BASE = rawBase.replace(/\/+$/, '');

// SignalR oyun hub'ı adresi.
export const HUB_URL = `${API_BASE}/gamehub`;
