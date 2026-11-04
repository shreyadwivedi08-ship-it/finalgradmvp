const CASHFLOW_KEYWORDS = [
  'salary', 'delay', 'delayed', 'cash', 'crunch', 'crash', 'bill', 'diwali',
  'festival', 'rent', 'emi', 'expense', 'tight', 'short', 'temporary',
  'bounce', 'crunch', 'month', 'cashflow', 'cash flow',
]

const ADVISORY_KEYWORDS = [
  'should i', 'which fund', 'best fund', 'recommend', 'advice', 'predict',
  'return', 'market', 'up', 'down', 'bull', 'bear', 'profit', 'loss',
  'switch', 'redeem', 'portfolio', 'compare', 'better than', 'allocate',
  'asset', 'gold', 'debt', 'equity ratio',
]

const CUTOFF_KEYWORDS = [
  'tomorrow', 'today', 'urgent', 'immediate', 'now', 'stop debit',
  'cancel now', 'hours', 'tonight',
]

function normalize(text) {
  return text.toLowerCase().trim()
}

function matchesAny(text, keywords) {
  return keywords.some(kw => text.includes(kw))
}

export default function evaluateReason(text) {
  const normalized = normalize(text || '')

  if (!normalized) {
    return { state: 'unknown', label: 'Empty input', confidence: 0 }
  }

  if (matchesAny(normalized, CUTOFF_KEYWORDS)) {
    return {
      state: 'cutoff',
      label: 'Bank Cutoff Alert',
      confidence: 0.88,
      detail: 'Debit date within T<5 working days — NACH batch locked.',
    }
  }

  if (matchesAny(normalized, ADVISORY_KEYWORDS)) {
    return {
      state: 'advisory',
      label: 'Advisory Fallback',
      confidence: 0.92,
      detail: 'Investment-advice intent detected — SEBI non-advisory guardrail engaged.',
    }
  }

  if (matchesAny(normalized, CASHFLOW_KEYWORDS)) {
    return {
      state: 'cashflow',
      label: 'Operational Cashflow Intent',
      confidence: 0.94,
      detail: 'Temporary cashflow issue — eligible for 1-month free skip.',
    }
  }

  return {
    state: 'cashflow',
    label: 'Operational Cashflow Intent',
    confidence: 0.5,
    detail: 'Unclassified — defaulting to cashflow (operational) path.',
  }
}
