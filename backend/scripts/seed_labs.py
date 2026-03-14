"""
Seed Purdue research lab data into Supabase + Pinecone.
Run once: python -m scripts.seed_labs
"""
import asyncio
import json
from pathlib import Path
from supabase import create_client
from app.core.config import settings
from app.services.embeddings import embed_text
from pinecone import Pinecone

LABS_FILE = Path(__file__).parent / "labs_data.json"

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
pc = Pinecone(api_key=settings.PINECONE_API_KEY)


async def seed():
    labs = json.loads(LABS_FILE.read_text())
    index = pc.Index(settings.PINECONE_INDEX_NAME)

    vectors = []
    for lab in labs:
        # Upsert into Supabase (includes professor_about)
        supabase.table("labs").upsert(lab).execute()

        # Build embedding text from all semantic fields
        text = " ".join([
            lab["professor"],
            lab["department"],
            " ".join(lab["research_areas"]),
            lab.get("description", ""),
            lab.get("professor_about", ""),
        ])
        embedding = await embed_text(text)
        vectors.append(
            {
                "id": lab["lab_id"],
                "values": embedding,
                "metadata": {
                    "professor": lab["professor"],
                    "department": lab["department"],
                    "research_areas": lab["research_areas"],
                    "contact_email": lab.get("contact_email", ""),
                    "description": lab.get("description", ""),
                    "professor_about": lab.get("professor_about", ""),
                },
            }
        )

    index.upsert(vectors=vectors)
    print(f"Seeded {len(labs)} labs.")


if __name__ == "__main__":
    asyncio.run(seed())
