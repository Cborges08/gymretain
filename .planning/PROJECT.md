# GymRetain — SaaS de Retenção para Academias

## What This Is

Plataforma SaaS de retenção para academias e boxes CrossFit que permite check-in digital de alunos via QR code exclusivo (sem login do aluno) e envia alertas automáticos por email ao dono quando um aluno fica sem aparecer por um número configurado de dias. Gerenciado pelo dono/admin da academia via painel web.

## Core Value

O dono da academia sabe, sem esforço, quais alunos estão sumindo — e recebe um empurrão para agir antes de perdê-los.

## Requirements

### Validated

- [x] Next.js 14 App Router + TypeScript + Tailwind + Supabase + Vercel stack — live and deployed (Validated in Phase 01: project-scaffold-database-foundation)
- [x] Supabase free tier sufficient for schema + RLS + indexes (Validated in Phase 01)
- [x] Vercel hobby tier auto-deploys on push to main (Validated in Phase 01)

### Validated

- [x] Admin da academia faz login seguro no painel (email/senha via Supabase Auth) — Validated in Phase 02: admin-authentication

### Validated

- [x] Admin pode cadastrar, editar, desativar/reativar alunos com validação de CPF e email duplicado (pt-BR) — Validated in Phase 03: member-management
- [x] Admin pode visualizar lista de alunos ativos, perfil individual com CPF mascarado, e exibir/imprimir QR Code da academia — Validated in Phase 03: member-management

### Validated

- [x] Aluno escaneia QR code da academia e registra check-in via CPF, sem login ou app — Validated in Phase 04: qr-check-in-flow

### Active
- [ ] Admin visualiza histórico de check-ins por aluno e frequência geral
- [ ] Sistema envia email automático ao admin quando aluno fica 7+ dias sem check-in
- [ ] Email de alerta inclui histórico de frequência do aluno e sugestão de abordagem
- [ ] Admin pode marcar aluno como "contatado" para silenciar alertas repetidos

### Out of Scope

- App mobile — MVP é web-only; mobile é roadmap futuro
- IA/ML — sem recomendações automatizadas no MVP
- Cobrança automatizada — sem Stripe ou gestão de pagamentos no MVP
- Multi-tenant — MVP é single-tenant (uma academia por instância); escala depois
- Integração com sistema Fácil — planejado para fases futuras; MVP cadastra alunos manualmente
- Login do aluno — check-in é anônimo via QR, sem conta do aluno

## Context

- **Stack decidida**: Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase + Vercel + Resend
- **Desenvolvedor solo**: 10-20h semanais — fases devem ser executáveis em sprints curtos
- **Free tier only**: Supabase free, Vercel hobby, Resend free (100 emails/dia) — sem custos no MVP
- **QR code fixo por aluno**: Gerado no cadastro, permanente (impresso ou salvo no celular pelo aluno)
- **Threshold de churn fixo**: 7 dias sem check-in dispara alerta (configurável em fases futuras)
- **Futuro**: Integração com sistema Fácil para importar alunos via login deles

## Constraints

- **Tech Stack**: Next.js 14 App Router + TypeScript + Tailwind + Supabase + Vercel + Resend — já decidido, não questionar
- **Budget**: 100% free tier — nenhuma feature pode exigir serviço pago
- **Capacidade**: Desenvolvedor solo, 10-20h/semana — escopo de cada fase deve refletir isso
- **Compatibilidade futura**: Modelo de dados de alunos deve ser compatível com futura integração Fácil (campo externo_id reservado)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-tenant no MVP | Simplifica auth, RLS e deploy; escala para multi-tenant depois | — Pending |
| QR code fixo por aluno | Sem fricção para o aluno (não precisa de app ou login); academia controla o cadastro | — Pending |
| Threshold de 7 dias fixo | Elimina complexidade de configuração no MVP; cobre o caso de uso principal | — Pending |
| Resend para emails | Integração nativa com Next.js, free tier generoso, API simples | — Pending |
| Supabase para auth + DB | Elimina necessidade de backend custom; RLS nativo protege dados | — Pending |

## Evolution

Este documento evolui a cada transição de fase e milestone.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 — Phase 04 complete (QR check-in flow live — gym QR scan, CPF entry, duplicate detection, audit trail)*
