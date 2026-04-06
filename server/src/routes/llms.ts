import { Router, type Request } from "express";
import type { Db } from "@paperclipai/db";
import { AGENT_ICON_NAMES } from "@paperclipai/shared";
import { forbidden } from "../errors.js";
import { listServerAdapters } from "../adapters/index.js";
import { agentService } from "../services/agents.js";

function hasCreatePermission(agent: { role: string; permissions: Record<string, unknown> | null | undefined }) {
  if (!agent.permissions || typeof agent.permissions !== "object") return false;
  return Boolean((agent.permissions as Record<string, unknown>).canCreateAgents);
}

export function llmRoutes(db: Db) {
  const router = Router();
  const agentsSvc = agentService(db);

  async function assertCanRead(req: Request) {
    if (req.actor.type === "board") return;
    if (req.actor.type !== "agent" || !req.actor.agentId) {
      throw forbidden("需要董事会身份或具备权限的智能体认证");
    }
    const actorAgent = await agentsSvc.getById(req.actor.agentId);
    if (!actorAgent || !hasCreatePermission(actorAgent)) {
      throw forbidden("缺少读取智能体配置说明的权限");
    }
  }

  router.get("/llms/agent-configuration.txt", async (req, res) => {
    await assertCanRead(req);
    const adapters = listServerAdapters().sort((a, b) => a.type.localeCompare(b.type));
    const lines = [
      "# Paperclip 智能体配置索引",
      "",
      "已安装的适配器：",
      ...adapters.map((adapter) => `- ${adapter.type}: /llms/agent-configuration/${adapter.type}.txt`),
      "",
      "相关 API 端点：",
      "- GET /api/companies/:companyId/agent-configurations",
      "- GET /api/agents/:id/configuration",
      "- POST /api/companies/:companyId/agent-hires",
      "",
      "智能体身份参考：",
      "- GET /llms/agent-icons.txt",
      "",
      "说明：",
      "- 配置读取 API 会对敏感值进行脱敏处理。",
      "- 是否以 pending_approval 状态创建新招聘项，取决于公司设置。",
      "",
    ];
    res.type("text/plain").send(lines.join("\n"));
  });

  router.get("/llms/agent-icons.txt", async (req, res) => {
    await assertCanRead(req);
    const lines = [
      "# Paperclip 智能体图标名称",
      "",
      "在 hire/create 请求体中，将 `icon` 字段设置为以下值之一：",
      ...AGENT_ICON_NAMES.map((name) => `- ${name}`),
      "",
      "示例：",
      '{ "name": "SearchOps", "role": "researcher", "icon": "search" }',
      "",
    ];
    res.type("text/plain").send(lines.join("\n"));
  });

  router.get("/llms/agent-configuration/:adapterType.txt", async (req, res) => {
    await assertCanRead(req);
    const adapterType = req.params.adapterType as string;
    const adapter = listServerAdapters().find((entry) => entry.type === adapterType);
    if (!adapter) {
      res.status(404).type("text/plain").send(`未知适配器类型：${adapterType}`);
      return;
    }
    res
      .type("text/plain")
      .send(
        adapter.agentConfigurationDoc ??
          `# ${adapterType} 智能体配置\n\n当前未注册该适配器的专用说明文档。`,
      );
  });

  return router;
}
