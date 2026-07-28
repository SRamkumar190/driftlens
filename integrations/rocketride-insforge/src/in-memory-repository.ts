import type {
  InsForgeRepository,
  IntentProfileDefinition,
  InvestigationWriteRecord,
  ReviewStatus,
  StoredIntentProfile,
  StoredInvestigationRecord,
} from "./types.js";

export class InMemoryInsForgeRepository implements InsForgeRepository {
  private readonly intentProfiles = new Map<string, StoredIntentProfile>();
  private readonly investigations = new Map<
    string,
    StoredInvestigationRecord
  >();
  private nextIntentId = 1;
  private nextInvestigationId = 1;

  constructor(
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async findIntentProfileByName(
    name: string,
  ): Promise<StoredIntentProfile | null> {
    const profile = this.intentProfiles.get(name);
    return profile ? { ...profile } : null;
  }

  async createIntentProfile(
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile> {
    const timestamp = this.clock().toISOString();
    const stored: StoredIntentProfile = {
      ...profile,
      id: `intent-${this.nextIntentId++}`,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.intentProfiles.set(profile.name, stored);
    return { ...stored };
  }

  async updateIntentProfile(
    id: string,
    profile: IntentProfileDefinition,
  ): Promise<StoredIntentProfile> {
    const existing = [...this.intentProfiles.values()].find(
      (candidate) => candidate.id === id,
    );
    if (!existing) {
      throw new Error("Intent profile not found");
    }

    const stored: StoredIntentProfile = {
      ...existing,
      ...profile,
      updated_at: this.clock().toISOString(),
    };
    if (existing.name !== profile.name) {
      this.intentProfiles.delete(existing.name);
    }
    this.intentProfiles.set(profile.name, stored);
    return { ...stored };
  }

  async findInvestigationByComponentId(
    componentId: string,
  ): Promise<StoredInvestigationRecord | null> {
    const record = this.investigations.get(componentId);
    return record ? { ...record } : null;
  }

  async createInvestigation(
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord> {
    const stored: StoredInvestigationRecord = {
      ...record,
      id: `investigation-${this.nextInvestigationId++}`,
      created_at: this.clock().toISOString(),
    };
    this.investigations.set(record.component_id, stored);
    return { ...stored };
  }

  async updateInvestigation(
    id: string,
    record: InvestigationWriteRecord,
  ): Promise<StoredInvestigationRecord> {
    const existing = this.investigations.get(record.component_id);
    if (!existing || existing.id !== id) {
      throw new Error("Investigation not found");
    }

    const stored: StoredInvestigationRecord = {
      ...existing,
      ...record,
    };
    this.investigations.set(record.component_id, stored);
    return { ...stored };
  }

  setReviewStatus(
    componentId: string,
    reviewStatus: ReviewStatus,
  ): void {
    const existing = this.investigations.get(componentId);
    if (!existing) {
      throw new Error("Investigation not found");
    }
    this.investigations.set(componentId, {
      ...existing,
      review_status: reviewStatus,
    });
  }

  get intentProfileCount(): number {
    return this.intentProfiles.size;
  }

  get investigationCount(): number {
    return this.investigations.size;
  }
}
