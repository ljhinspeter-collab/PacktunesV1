class MythicSerialService {
  private mythicCounts: Record<string, number>;

  constructor() {
    this.mythicCounts = this.loadFromStorage();
  }

  private loadFromStorage(): Record<string, number> {
    try {
      const saved = localStorage.getItem('packtunes_mythic_serials');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('packtunes_mythic_serials', JSON.stringify(this.mythicCounts));
    } catch {}
  }

  getNextSerialNumber(songId: string): number {
    const currentCount = this.mythicCounts[songId] || 0;
    const nextSerialNumber = currentCount + 1;
    this.mythicCounts[songId] = nextSerialNumber;
    this.saveToStorage();
    return nextSerialNumber;
  }

  setSerialNumberCount(songId: string, count: number) {
    if (count > (this.mythicCounts[songId] || 0)) {
      this.mythicCounts[songId] = count;
      this.saveToStorage();
    }
  }

  reset() {
    this.mythicCounts = {};
    this.saveToStorage();
  }
}

export const mythicSerialService = new MythicSerialService();
