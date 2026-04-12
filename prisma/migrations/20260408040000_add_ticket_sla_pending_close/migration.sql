-- Migration: add_ticket_sla_pending_close
-- Adiciona SLA fields no Ticket e o status PENDING_CLOSE

-- 1. Adicionar PENDING_CLOSE ao enum TicketStatus
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PENDING_CLOSE';

-- 2. Adicionar campos de SLA ao Ticket
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "slaAttendanceDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaResolutionDeadline"  TIMESTAMP(3);
