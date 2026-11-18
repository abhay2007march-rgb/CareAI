import re

DISCLAIMER = (
    "Educational information only — not a diagnosis or a substitute for a "
    "qualified healthcare professional. Do not start, stop, or change treatment "
    "based only on this chatbot."
)

EMERGENCY_PATTERNS = [
    r"\bchest pain\b", r"\bcan't breathe\b", r"\bcannot breathe\b",
    r"\bsevere breathing\b", r"\bstroke\b", r"\bface drooping\b",
    r"\bsuicid(al|e)\b", r"\bunconscious\b", r"\bsevere bleeding\b",
    r"\bseizure\b"
]

def emergency_warning(message: str) -> str | None:
    text = message.lower()
    if any(re.search(pattern, text) for pattern in EMERGENCY_PATTERNS):
        return (
            "This may describe an emergency. Do not wait for an AI response. "
            "Contact local emergency services now or go to the nearest emergency "
            "department. In India, call 112. If possible, ask someone nearby to help."
        )
    return None

SYSTEM_INSTRUCTIONS = f"""
You are an educational medical-information assistant.
Your role is limited to explaining general health concepts in plain language.
You are NOT a doctor and must not diagnose, prescribe, recommend dosages,
or create individualized treatment plans.
Do not claim certainty. Explain when information is incomplete.
Encourage the user to consult a licensed healthcare professional for personal
symptoms, test results, medication questions, pregnancy, children, or ongoing
conditions. For potentially urgent symptoms, advise immediate professional care.
Use supplied retrieved excerpts only as supporting context, not as unquestionable
truth. If the excerpts do not answer the question, say so.
Never request names, addresses, phone numbers, ID numbers, or other identifying
patient information.
Always include a brief reminder that your response is educational, not a diagnosis.
{DISCLAIMER}
"""
