import { SessionSnapshot, SessionIndexEntry } from './types';

const SESSION_VERSION = '1.0.0';
const MAX_SESSIONS = 50;
const INDEX_KEY = 'ddwp.sessions.index';
const SESSION_PREFIX = 'ddwp.session.';

// Generate ULID-like ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date as dd/mm/yyyy HH:mm
function formatDateTime(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Parse date from dd/mm/yyyy HH:mm format
function parseDateTime(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hours, minutes);
}

// Get session index from localStorage
export function getSessionIndex(): SessionIndexEntry[] {
  try {
    const stored = localStorage.getItem(INDEX_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save session index to localStorage
function saveSessionIndex(index: SessionIndexEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

// Get session snapshot from localStorage
export function getSessionSnapshot(sessionId: string): SessionSnapshot | null {
  try {
    const stored = localStorage.getItem(`${SESSION_PREFIX}${sessionId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Save session snapshot to localStorage
function saveSessionSnapshot(sessionId: string, snapshot: SessionSnapshot): void {
  localStorage.setItem(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(snapshot));
}

// Prune old sessions if we exceed MAX_SESSIONS
function pruneOldSessions(): void {
  const index = getSessionIndex();
  if (index.length >= MAX_SESSIONS) {
    // Sort by updatedAt ascending (oldest first)
    const sorted = [...index].sort((a, b) => 
      parseDateTime(a.updatedAt).getTime() - parseDateTime(b.updatedAt).getTime()
    );
    
    // Remove oldest sessions
    const toRemove = sorted.slice(0, index.length - MAX_SESSIONS + 1);
    toRemove.forEach(session => {
      localStorage.removeItem(`${SESSION_PREFIX}${session.id}`);
    });
    
    // Update index
    const remaining = index.filter(session => 
      !toRemove.some(removed => removed.id === session.id)
    );
    saveSessionIndex(remaining);
  }
}

// Create a new session
export function createSession(
  name: string,
  sourceFileName: string,
  sourceFileHash: string,
  planningMode: 'Daily' | 'Weekly' | 'Monthly',
  adHocProducts: Array<{
    productId: string;
    product: {
      product_name: string;
      brand: string;
      category: string;
      supplier_name: string;
      purchase_cost: number;
    };
    targetPrice: number;
    quantity: number;
  }>,
  bundles: Array<{
    bundleName: string;
    products: Array<{
      productId: string;
      product: {
        product_name: string;
        brand: string;
        category: string;
        supplier_name: string;
        purchase_cost: number;
      };
      targetPrice: number;
      quantity: number;
    }>;
    bundlePrice: number;
  }>,
  totals: {
    totalProducts: number;
    totalQuantity: number;
    totalPurchaseCost: number;
    totalSalesValue: number;
    totalMargin: number;
  },
  ui: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    selectedRows: string[];
    scrollPosition: number;
  }
): string {
  const sessionId = generateId();
  const now = new Date();
  const savedAt = formatDateTime(now);
  
  // Create snapshot
  const snapshot: SessionSnapshot = {
    version: SESSION_VERSION,
    savedAt,
    sourceFile: {
      name: sourceFileName,
      hash: sourceFileHash
    },
    planningMode,
    adHocProducts: adHocProducts.map(product => ({
      id: product.productId,
      name: product.product.product_name,
      brand: product.product.brand,
      category: product.product.category,
      supplier: product.product.supplier_name,
      cost: product.product.purchase_cost,
      promoPrice: product.targetPrice,
      qty: product.quantity
    })),
    bundles: bundles.map(bundle => {
      const accumCost = bundle.products.reduce((sum: number, item) => 
        sum + (item.product.purchase_cost * item.quantity), 0
      );
      const accumSelling = bundle.products.reduce((sum: number, item) => 
        sum + (item.targetPrice * item.quantity), 0
      );
      const gpR = bundle.bundlePrice - accumCost;
      const marginPct = bundle.bundlePrice > 0 ? (gpR / bundle.bundlePrice) * 100 : 0;
      const savedR = accumSelling - bundle.bundlePrice;
      const savedPct = accumSelling > 0 ? (savedR / accumSelling) * 100 : 0;
      
      return {
        name: bundle.bundleName,
        ids: bundle.products.map((p) => p.productId),
        items: bundle.products.map((item) => ({
          id: item.productId,
          name: item.product.product_name,
          cost: item.product.purchase_cost,
          promoPrice: item.targetPrice,
          qty: item.quantity
        })),
        bundlePrice: bundle.bundlePrice,
        accumCost,
        accumSelling,
        gpR,
        marginPct,
        savedR,
        savedPct
      };
    }),
    totals,
    ui
  };
  
  // Save snapshot
  saveSessionSnapshot(sessionId, snapshot);
  
  // Add to index
  const index = getSessionIndex();
  index.push({
    id: sessionId,
    name,
    savedAt,
    updatedAt: savedAt,
    sourceFile: sourceFileName,
    itemCount: adHocProducts.length,
    bundleCount: bundles.length
  });
  
  // Prune old sessions if needed
  pruneOldSessions();
  
  return sessionId;
}

// Update existing session
export function updateSession(
  sessionId: string,
  adHocProducts: Array<{
    productId: string;
    product: {
      product_name: string;
      brand: string;
      category: string;
      supplier_name: string;
      purchase_cost: number;
    };
    targetPrice: number;
    quantity: number;
  }>,
  bundles: Array<{
    bundleName: string;
    products: Array<{
      productId: string;
      product: {
        product_name: string;
        brand: string;
        category: string;
        supplier_name: string;
        purchase_cost: number;
      };
      targetPrice: number;
      quantity: number;
    }>;
    bundlePrice: number;
  }>,
  totals: {
    totalProducts: number;
    totalQuantity: number;
    totalPurchaseCost: number;
    totalSalesValue: number;
    totalMargin: number;
  },
  ui: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    selectedRows: string[];
    scrollPosition: number;
  }
): void {
  const snapshot = getSessionSnapshot(sessionId);
  if (!snapshot) return;
  
  const now = new Date();
  const updatedAt = formatDateTime(now);
  
  // Update snapshot
  const updatedSnapshot: SessionSnapshot = {
    ...snapshot,
    savedAt: updatedAt,
    adHocProducts: adHocProducts.map(product => ({
      id: product.productId,
      name: product.product.product_name,
      brand: product.product.brand,
      category: product.product.category,
      supplier: product.product.supplier_name,
      cost: product.product.purchase_cost,
      promoPrice: product.targetPrice,
      qty: product.quantity
    })),
    bundles: bundles.map(bundle => {
      const accumCost = bundle.products.reduce((sum: number, item) => 
        sum + (item.product.purchase_cost * item.quantity), 0
      );
      const accumSelling = bundle.products.reduce((sum: number, item) => 
        sum + (item.targetPrice * item.quantity), 0
      );
      const gpR = bundle.bundlePrice - accumCost;
      const marginPct = bundle.bundlePrice > 0 ? (gpR / bundle.bundlePrice) * 100 : 0;
      const savedR = accumSelling - bundle.bundlePrice;
      const savedPct = accumSelling > 0 ? (savedR / accumSelling) * 100 : 0;
      
      return {
        name: bundle.bundleName,
        ids: bundle.products.map((p) => p.productId),
        items: bundle.products.map((item) => ({
          id: item.productId,
          name: item.product.product_name,
          cost: item.product.purchase_cost,
          promoPrice: item.targetPrice,
          qty: item.quantity
        })),
        bundlePrice: bundle.bundlePrice,
        accumCost,
        accumSelling,
        gpR,
        marginPct,
        savedR,
        savedPct
      };
    }),
    totals,
    ui
  };
  
  // Save updated snapshot
  saveSessionSnapshot(sessionId, updatedSnapshot);
  
  // Update index
  const index = getSessionIndex();
  const indexEntry = index.find(entry => entry.id === sessionId);
  if (indexEntry) {
    indexEntry.updatedAt = updatedAt;
    indexEntry.itemCount = adHocProducts.length;
    indexEntry.bundleCount = bundles.length;
    saveSessionIndex(index);
  }
}

// Delete session
export function deleteSession(sessionId: string): void {
  localStorage.removeItem(`${SESSION_PREFIX}${sessionId}`);
  
  const index = getSessionIndex();
  const updatedIndex = index.filter(entry => entry.id !== sessionId);
  saveSessionIndex(updatedIndex);
}

// Rename session
export function renameSession(sessionId: string, newName: string): void {
  const index = getSessionIndex();
  const indexEntry = index.find(entry => entry.id === sessionId);
  if (indexEntry) {
    indexEntry.name = newName;
    saveSessionIndex(index);
  }
}

// Duplicate session
export function duplicateSession(sessionId: string): string {
  const snapshot = getSessionSnapshot(sessionId);
  if (!snapshot) return '';
  
  const newSessionId = generateId();
  const now = new Date();
  const savedAt = formatDateTime(now);
  
  // Create new snapshot with updated timestamp
  const newSnapshot: SessionSnapshot = {
    ...snapshot,
    savedAt
  };
  
  // Save new snapshot
  saveSessionSnapshot(newSessionId, newSnapshot);
  
  // Add to index
  const index = getSessionIndex();
  index.push({
    id: newSessionId,
    name: `${snapshot.sourceFile.name} (copy)`,
    savedAt,
    updatedAt: savedAt,
    sourceFile: snapshot.sourceFile.name,
    itemCount: snapshot.adHocProducts.length,
    bundleCount: snapshot.bundles.length
  });
  
  saveSessionIndex(index);
  
  return newSessionId;
}

// Export session as JSON
export function exportSession(sessionId: string): string {
  const snapshot = getSessionSnapshot(sessionId);
  return snapshot ? JSON.stringify(snapshot, null, 2) : '';
}

// Import session from JSON
export function importSession(jsonData: string): string | null {
  try {
    const snapshot: SessionSnapshot = JSON.parse(jsonData);
    
    // Validate required fields
    if (!snapshot.version || !snapshot.savedAt || !snapshot.sourceFile || 
        !snapshot.planningMode || !Array.isArray(snapshot.adHocProducts) || 
        !Array.isArray(snapshot.bundles) || !snapshot.totals) {
      throw new Error('Invalid session data');
    }
    
    const sessionId = generateId();
    const now = new Date();
    const savedAt = formatDateTime(now);
    
    // Update timestamp
    const importedSnapshot: SessionSnapshot = {
      ...snapshot,
      savedAt
    };
    
    // Save snapshot
    saveSessionSnapshot(sessionId, importedSnapshot);
    
    // Add to index
    const index = getSessionIndex();
    index.push({
      id: sessionId,
      name: snapshot.sourceFile.name,
      savedAt,
      updatedAt: savedAt,
      sourceFile: snapshot.sourceFile.name,
      itemCount: snapshot.adHocProducts.length,
      bundleCount: snapshot.bundles.length
    });
    
    saveSessionIndex(index);
    
    return sessionId;
  } catch {
    return null;
  }
}

// Get sorted session index (by updatedAt desc)
export function getSortedSessionIndex(): SessionIndexEntry[] {
  const index = getSessionIndex();
  return [...index].sort((a, b) => 
    parseDateTime(b.updatedAt).getTime() - parseDateTime(a.updatedAt).getTime()
  );
}
