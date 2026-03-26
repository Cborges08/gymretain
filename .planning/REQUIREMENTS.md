# Requirements: GymRetain

**Defined:** 2026-03-25
**Core Value:** O dono da academia sabe, sem esforço, quais alunos estão sumindo — e recebe um empurrão para agir antes de perdê-los.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: Admin pode criar conta com email e senha
- [ ] **AUTH-02**: Admin pode fazer login com email e senha
- [ ] **AUTH-03**: Admin pode fazer logout
- [ ] **AUTH-04**: Sessão persiste entre refreshes do browser
- [ ] **AUTH-05**: Rotas do dashboard são protegidas por middleware (redireciona para login se não autenticado)
- [ ] **AUTH-06**: Admin pode resetar senha via email

### Membros

- [ ] **MEMB-01**: Admin pode cadastrar aluno com nome, email e telefone (opcional)
- [ ] **MEMB-02**: QR code único é gerado automaticamente ao cadastrar aluno
- [ ] **MEMB-03**: Admin pode visualizar lista de todos os alunos com status de frequência
- [ ] **MEMB-04**: Admin pode visualizar perfil individual do aluno com histórico de check-ins
- [ ] **MEMB-05**: Admin pode editar dados do aluno
- [ ] **MEMB-06**: Admin pode desativar/reativar aluno (não deleta dados)
- [ ] **MEMB-07**: Schema inclui campo `external_id` reservado para futura integração Fácil

### Check-in

- [ ] **CHKN-01**: Aluno escaneia QR code e acessa página de check-in sem login
- [ ] **CHKN-02**: Página de check-in confirma check-in com nome do aluno e horário
- [ ] **CHKN-03**: Check-in duplicado na mesma sessão (dentro de 4h) é rejeitado com mensagem amigável
- [ ] **CHKN-04**: Check-in registra timestamp, IP e user-agent para auditoria
- [ ] **CHKN-05**: `last_checked_in` do aluno é atualizado a cada check-in
- [ ] **CHKN-06**: QR code inválido ou de aluno desativado exibe página de erro clara

### Dashboard

- [ ] **DASH-01**: Dashboard exibe lista de alunos ordenada por dias sem aparecer (mais críticos primeiro)
- [ ] **DASH-02**: Dashboard mostra contagem: alunos ativos, em risco (4-7 dias), inativos (7+ dias)
- [ ] **DASH-03**: Histórico de check-ins do aluno é paginado (máx 50 por página)
- [ ] **DASH-04**: Admin pode marcar aluno como "contatado" para silenciar alertas por 7 dias
- [ ] **DASH-05**: Dashboard tem botão "Verificar Churn Agora" como fallback do cron

### Alertas de Churn

- [ ] **ALRT-01**: Cron job roda diariamente às 6h UTC identificando alunos sem check-in há 7+ dias
- [ ] **ALRT-02**: Email de alerta enviado ao admin com lista de alunos inativos
- [ ] **ALRT-03**: Email inclui: nome do aluno, dias sem aparecer, histórico de últimas 4 semanas, sugestão de abordagem
- [ ] **ALRT-04**: Alunos marcados como "contatado" nas últimas 7 dias não geram novo alerta
- [ ] **ALRT-05**: Cron job usa `SUPABASE_SERVICE_ROLE_KEY` (não anon key) para contornar RLS
- [ ] **ALRT-06**: Falha de envio de email é registrada em log (não derruba o cron)
- [ ] **ALRT-07**: Máximo de 100 emails/dia respeitado (batching se necessário)

### Infraestrutura

- [x] **INFR-01**: Deploy automático no Vercel a partir de push na branch main
- [x] **INFR-02**: Variáveis de ambiente configuradas no Vercel (Supabase keys, Resend key, cron secret)
- [x] **INFR-03**: RLS policies ativas em todas as tabelas — queries sem auth retornam vazio
- [x] **INFR-04**: Indexes em `members(last_checked_in)` e `checkins(member_id, checked_in_at)`

## v2 Requirements

### Configuração da Academia

- **CFG-01**: Admin pode configurar threshold de inatividade (padrão: 7 dias, range: 3-30)
- **CFG-02**: Admin pode configurar horário do cron de alertas
- **CFG-03**: Admin pode personalizar template de email de alerta

### Importação e Integração

- **IMPT-01**: Admin pode importar alunos via CSV (nome, email, telefone)
- **INTG-01**: Integração com sistema Fácil para sincronização automática de alunos
- **INTG-02**: Login do aluno via sistema Fácil para histórico pessoal

### Analytics

- **ANLT-01**: Relatório de retenção mensal (taxa de alunos ativos vs inativos)
- **ANLT-02**: Gráfico de tendência de frequência por semana
- **ANLT-03**: Exportação de dados de frequência em CSV

### Multi-Tenant

- **MULT-01**: Suporte a múltiplas academias na mesma instância
- **MULT-02**: Admin de uma academia não vê dados de outra

## Out of Scope

| Feature | Reason |
|---------|--------|
| App mobile | Web-only no MVP; QR scan funciona em qualquer browser mobile |
| Login do aluno | Zero-fricção é o diferencial; conta de aluno adiciona complexidade |
| Cobrança automatizada | Stripe/pagamentos fora do escopo do MVP |
| IA/ML | Sem recomendações automáticas; alertas simples são suficientes |
| Multi-tenant | Uma academia por instância no MVP; escala depois |
| SMS/push notifications | Resend (email) cobre o caso de uso; SMS tem custo |
| Gamificação | Furado no MVP; validar core primeiro |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| MEMB-01 | Phase 2 | Pending |
| MEMB-02 | Phase 2 | Pending |
| MEMB-03 | Phase 2 | Pending |
| MEMB-04 | Phase 2 | Pending |
| MEMB-05 | Phase 2 | Pending |
| MEMB-06 | Phase 2 | Pending |
| MEMB-07 | Phase 2 | Pending |
| CHKN-01 | Phase 3 | Pending |
| CHKN-02 | Phase 3 | Pending |
| CHKN-03 | Phase 3 | Pending |
| CHKN-04 | Phase 3 | Pending |
| CHKN-05 | Phase 3 | Pending |
| CHKN-06 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| ALRT-01 | Phase 5 | Pending |
| ALRT-02 | Phase 5 | Pending |
| ALRT-03 | Phase 5 | Pending |
| ALRT-04 | Phase 5 | Pending |
| ALRT-05 | Phase 5 | Pending |
| ALRT-06 | Phase 5 | Pending |
| ALRT-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
