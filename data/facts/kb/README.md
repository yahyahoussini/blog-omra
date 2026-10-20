# Religious knowledge base (approved texts only)

This folder will hold the **only** Qur'an verses, hadith, du'a and ritual statements that pages may quote
(STRATEGY 4.5 and 7.4 gate 4). It is empty on purpose: no religious reviewer has been named yet.

Rules:
- One JSON file per entry, with the exact text, its reference (sura:verse, collection and number),
  the source URL or book edition, and the name of the **real** religious reviewer who approved it.
- The generator never writes religious text from memory. A page that needs a text that is not here
  waits until it is added and approved.
- Ritual counts and fixed expressions approved here may be added to `config/approved-phrases.json`
  so the facts gate accepts them (for example « les 10 dernières nuits »).
