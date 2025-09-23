import { WorkflowStorageRepository } from '../repositories/workflow-storage';
import { WorkflowIndexRepository } from '../repositories/workflow-index';
import { deriveNameFromDocument } from '../utils/workflow';
import { DEFAULT_STATUS, MAX_VERSION_HISTORY } from '../constants';
import type {
  WorkflowSummary,
  WorkflowDetail,
  WorkflowVersionHeader,
  WorkflowVersionRecord,
  InitializeInput,
  UpdateStateInput,
  SaveVersionInput,
  RestoreVersionInput,
  RenameVersionInput,
  DeleteVersionInput
} from '../types/workflow';

export class WorkflowService {
  private storage: WorkflowStorageRepository;
  private indexRepo: WorkflowIndexRepository;
  private ctxId: string;

  constructor({ storage, indexRepo, ctxId }: {
    storage: WorkflowStorageRepository;
    indexRepo: WorkflowIndexRepository;
    ctxId: string
  }) {
    this.storage = storage;
    this.indexRepo = indexRepo;
    this.ctxId = ctxId;
  }

  private buildSummaryFromMeta(map: Map<string, string>): WorkflowSummary {
    const workflowId = map.get("workflow_id") ?? this.ctxId;
    const createdAt = this.storage.parseNumber(map.get("created_at"), Date.now());
    const updatedAt = this.storage.parseNumber(map.get("updated_at"), createdAt);

    return {
      id: workflowId,
      doName: this.ctxId,
      name: map.get("name") ?? undefined,
      type: map.get("type") ?? undefined,
      status: map.get("status") ?? DEFAULT_STATUS,
      createdAt,
      updatedAt
    };
  }

  private buildDetailFromMeta(map: Map<string, string>): WorkflowDetail {
    const summary = this.buildSummaryFromMeta(map);
    const document = this.storage.parseJson<unknown>(map.get("current_document"));
    const code = map.get("current_code") ?? "";
    const lastRestoredVersionId = map.get("last_restored_version_id") ?? null;
    const versions = this.storage.listVersionHeaders();

    return {
      workflowId: summary.id,
      name: summary.name,
      type: summary.type,
      status: summary.status,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      document,
      code,
      lastRestoredVersionId,
      versions
    };
  }

  async initialize(input: InitializeInput): Promise<WorkflowDetail> {
    const map = this.storage.getMetaMap();
    const now = Date.now();
    const workflowId = map.get("workflow_id") ?? input.workflowId;

    this.storage.setMeta("workflow_id", workflowId);

    const type = input.type ?? map.get("type") ?? undefined;
    if (type) {
      this.storage.setMeta("type", type);
    }

    const derivedName = input.name ?? deriveNameFromDocument(input.document);
    if (derivedName) {
      this.storage.setMeta("name", derivedName);
    }

    const status = input.status ?? map.get("status") ?? DEFAULT_STATUS;
    this.storage.setMeta("status", status);

    const createdAt = map.has("created_at")
      ? this.storage.parseNumber(map.get("created_at"), now)
      : now;
    this.storage.setMeta("created_at", createdAt.toString());
    this.storage.setMeta("updated_at", now.toString());

    this.storage.setMeta("current_document", JSON.stringify(input.document));
    this.storage.setMeta("current_code", input.code);

    const detail = this.buildDetailFromMeta(this.storage.getMetaMap());
    await this.indexRepo.upsert(this.buildSummaryFromMeta(this.storage.getMetaMap()));

    return detail;
  }

  async getDetail(): Promise<WorkflowDetail> {
    return this.buildDetailFromMeta(this.storage.getMetaMap());
  }

  async getSummary(): Promise<WorkflowSummary> {
    return this.buildSummaryFromMeta(this.storage.getMetaMap());
  }

  async updateState(input: UpdateStateInput): Promise<WorkflowDetail> {
    const now = Date.now();

    this.storage.setMeta("current_document", JSON.stringify(input.document));
    this.storage.setMeta("current_code", input.code);

    if (input.type) {
      this.storage.setMeta("type", input.type);
    }

    if (input.name) {
      this.storage.setMeta("name", input.name);
    } else {
      const derivedName = deriveNameFromDocument(input.document);
      if (derivedName) {
        this.storage.setMeta("name", derivedName);
      }
    }

    if (input.status) {
      this.storage.setMeta("status", input.status);
    }

    this.storage.setMeta("updated_at", now.toString());

    const detail = this.buildDetailFromMeta(this.storage.getMetaMap());
    await this.indexRepo.upsert(this.buildSummaryFromMeta(this.storage.getMetaMap()));

    return detail;
  }

  async saveVersion(input: SaveVersionInput): Promise<WorkflowVersionHeader> {
    const now = Date.now();
    const seqResult = this.storage.getNextSequence();
    const nextSeq = seqResult + 1;

    const trimmed = input.name?.trim();
    const label = trimmed && trimmed.length > 0
      ? trimmed
      : `Auto-save ${new Date(now).toLocaleString()}`;
    const isNamed = Boolean(trimmed && trimmed.length > 0);

    const record: WorkflowVersionRecord = {
      id: crypto.randomUUID(),
      seq: nextSeq,
      name: label,
      createdAt: now,
      document: JSON.stringify(input.document),
      code: input.code,
      isNamed
    };

    this.storage.insertVersion(record);
    this.storage.enforceVersionLimit(MAX_VERSION_HISTORY);

    this.storage.setMeta("last_restored_version_id", record.id);
    this.storage.setMeta("updated_at", now.toString());

    await this.indexRepo.upsert(this.buildSummaryFromMeta(this.storage.getMetaMap()));

    return {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      isNamed: record.isNamed
    };
  }

  async restoreVersion({ versionId }: RestoreVersionInput): Promise<WorkflowDetail> {
    const record = this.storage.getVersionRecord(versionId);
    if (!record) {
      throw new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    this.storage.setMeta("current_document", record.document);
    this.storage.setMeta("current_code", record.code);
    this.storage.setMeta("last_restored_version_id", record.id);
    this.storage.setMeta("updated_at", Date.now().toString());

    const detail = this.buildDetailFromMeta(this.storage.getMetaMap());
    await this.indexRepo.upsert(this.buildSummaryFromMeta(this.storage.getMetaMap()));

    return detail;
  }

  async renameVersion({ versionId, name }: RenameVersionInput): Promise<WorkflowVersionHeader> {
    const record = this.storage.getVersionRecord(versionId);
    if (!record) {
      throw new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const trimmed = name.trim();
    const label = trimmed.length > 0 ? trimmed : record.name;
    const isNamed = trimmed.length > 0;

    this.storage.updateVersion({ versionId, name: label, isNamed });

    return {
      id: versionId,
      name: label,
      createdAt: record.createdAt,
      isNamed
    };
  }

  async deleteVersion({ versionId }: DeleteVersionInput): Promise<void> {
    const record = this.storage.getVersionRecord(versionId);
    if (!record) {
      return;
    }

    this.storage.deleteVersion(versionId);
    const lastRestored = this.storage.getMetaValue("last_restored_version_id");
    if (lastRestored === versionId) {
      this.storage.deleteMeta("last_restored_version_id");
    }
  }

  async deleteWorkflow(): Promise<void> {
    const map = this.storage.getMetaMap();
    const workflowId = map.get("workflow_id") ?? this.ctxId;
    await this.storage.deleteAll();
    await this.indexRepo.remove(workflowId);
  }
}