import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pymupdf as fitz
import docx
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User, Job, ScreeningCriteria, UserRole

def create_sample_pdf(file_path: Path, text_content: str):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    rect = fitz.Rect(50, 50, 545, 792)
    page.insert_textbox(rect, text_content, fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    doc.save(str(file_path))
    doc.close()

def create_sample_docx(file_path: Path, title: str, sections: list):
    doc = docx.Document()
    doc.add_heading(title, 0)
    for heading, content in sections:
        doc.add_heading(heading, level=1)
        doc.add_paragraph(content)
    doc.save(str(file_path))

def generate_samples():
    sample_dir = backend_dir.parent / "sample_data"
    resumes_dir = sample_dir / "resumes"
    resumes_dir.mkdir(parents=True, exist_ok=True)

    # 1. Candidate 1: Alex Rivera (Senior Backend Python Engineer - Strong Match)
    alex_text = """Alex Rivera
Senior Software Engineer
Email: alex.rivera@example.com | Phone: (555) 234-5678 | San Francisco, CA

SUMMARY
Experienced backend software engineer with over 6 years of expertise building high-throughput distributed microservices in Python, FastAPI, and PostgreSQL. Proven track record leading containerized cloud deployments on AWS and Docker.

WORK EXPERIENCE
Lead Python Backend Engineer | CloudScale Inc.
2021 – Present
- Architected and deployed scalable REST APIs and event-driven microservices using FastAPI, Redis, and PostgreSQL.
- Orchestrated container deployments using Docker and Kubernetes on AWS (ECS, EKS, RDS).
- Established CI/CD pipelines with GitHub Actions reducing deployment lead time by 45%.

Software Engineer | FinTech Systems
2019 – 2021
- Developed core transaction validation engines using Python, Django, and PostgreSQL.
- Optimized high-concurrency SQL queries reducing latency by 35%.

Junior Developer | WebCraft Solutions
2018 – 2019
- Built RESTful endpoints and integrated external vendor APIs in Python.

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2018

TECHNICAL SKILLS & CERTIFICATIONS
Languages: Python, SQL, JavaScript
Frameworks: FastAPI, Django, REST API
Infrastructure: Docker, Kubernetes, AWS, Redis, PostgreSQL, Git, CI/CD
Certifications: AWS Certified Solutions Architect (2022)
"""
    create_sample_pdf(resumes_dir / "alex_rivera_senior_python.pdf", alex_text)

    # 2. Candidate 2: Maya Lin (Full Stack & Frontend Engineer - Partial Match)
    maya_text = """Maya Lin
Frontend & Full Stack Developer
Email: maya.lin@example.com | Phone: (555) 876-5432 | Seattle, WA

PROFESSIONAL SUMMARY
Creative and detail-oriented Full Stack Developer with 4 years of experience crafting interactive web applications using React, Next.js, and TypeScript. Comfortable with Node.js and Tailwind CSS.

EXPERIENCE
Frontend Software Engineer | Apex Digital
2022 – Present
- Designed responsive web dashboards in Next.js, React, and Tailwind CSS.
- Integrated REST APIs and GraphQL endpoints for real-time analytics.

Web Developer | Creative Studios
2020 – 2022
- Developed customer-facing web portals with React, JavaScript, and HTML/CSS.
- Collaborated in an Agile Scrum environment with bi-weekly sprints.

EDUCATION
Bachelor of Arts in Interactive Media & Computing
University of Washington | 2020

SKILLS
React, Next.js, TypeScript, JavaScript, Tailwind CSS, HTML, CSS, Node.js, Git, Agile, REST API
"""
    create_sample_pdf(resumes_dir / "maya_lin_fullstack.pdf", maya_text)

    # 3. Candidate 3: Marcus Vance (DOCX Format - DevOps & Cloud)
    marcus_sections = [
        ("Summary", "DevOps Engineer with 5 years of experience in cloud infrastructure, Docker, CI/CD, and Linux automation. Basic familiarity with Python scripting."),
        ("Experience", "DevOps Engineer at Nexus Cloud (2021 - Present)\nImplemented automated CI/CD pipelines using GitHub Actions and Docker. Managed AWS cloud infrastructure.\n\nSystems Administrator at TechCore (2019 - 2021)\nAdministered Linux servers, PostgreSQL databases, and Docker containers."),
        ("Education", "Bachelor of Science in Information Technology, Ohio State University (2019)"),
        ("Skills & Certifications", "Docker, Kubernetes, AWS, Linux, CI/CD, Git, PostgreSQL, Python, Certified Kubernetes Administrator (CKA)")
    ]
    create_sample_docx(resumes_dir / "marcus_vance_devops.docx", "Marcus Vance - DevOps Engineer (marcus.vance@example.com)", marcus_sections)

    # 4. Candidate 4: Elena Rostova (Data & ML Engineer - PDF)
    elena_text = """Elena Rostova
Machine Learning & Data Engineer
Email: elena.rostova@example.com | Phone: (555) 345-6789 | Boston, MA

SUMMARY
Data Engineer with 3.5 years of experience specializing in Machine Learning, Pandas, PyTorch, and Python data pipelines.

EXPERIENCE
Data Engineer | DataMinds AI
2022 – Present
- Built data ingestion pipelines and ETL workflows using Python, Pandas, and PostgreSQL.
- Trained NLP and LLM prompt classification models using PyTorch.

Junior Data Analyst | Insight Labs
2021 – 2022
- Created automated reporting scripts in Python, NumPy, and SQL.

EDUCATION
Master of Science in Data Science | Boston University (2021)
Bachelor of Science in Mathematics | Boston University (2019)

SKILLS
Python, Machine Learning, Deep Learning, PyTorch, TensorFlow, Pandas, NumPy, SQL, PostgreSQL, Docker, Git
"""
    create_sample_pdf(resumes_dir / "elena_rostova_ml.pdf", elena_text)

    print(f"Sample resumes created in {resumes_dir}")

    # Seed Database with realistic sample jobs
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("AdminPass123!"),
                full_name="HR Operations Lead",
                role=UserRole.HR_ADMIN.value,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Job 1: Senior Python Backend Engineer
        job1 = db.query(Job).filter(Job.title == "Senior Python Backend Engineer").first()
        if not job1:
            job1 = Job(
                title="Senior Python Backend Engineer",
                department="Engineering",
                description="We are seeking an experienced Senior Python Backend Engineer to lead development of our distributed core services.",
                responsibilities="Design, build, and maintain high-volume REST APIs with FastAPI; optimize database interactions with PostgreSQL; build CI/CD pipelines.",
                location="San Francisco, CA",
                work_arrangement="Hybrid",
                created_by_id=admin.id
            )
            db.add(job1)
            db.flush()

            crit1 = ScreeningCriteria(
                job_id=job1.id,
                mandatory_skills=[
                    {"name": "Python", "min_years": 3.0, "synonyms": ["py", "python3"]},
                    {"name": "FastAPI", "min_years": 1.0, "synonyms": ["fast api"]},
                    {"name": "PostgreSQL", "min_years": 2.0, "synonyms": ["postgres", "psql"]},
                    {"name": "Docker", "min_years": 1.0, "synonyms": ["containerization"]}
                ],
                preferred_skills=[
                    {"name": "AWS", "weight": 1.5, "synonyms": ["amazon web services"]},
                    {"name": "Kubernetes", "weight": 1.2, "synonyms": ["k8s"]},
                    {"name": "Redis", "weight": 1.0, "synonyms": ["redis cache"]},
                    {"name": "CI/CD", "weight": 1.0, "synonyms": ["github actions"]}
                ],
                min_experience_years=3.0,
                required_qualifications=[
                    {"degree": "Bachelor", "field": "Computer Science"}
                ],
                weights={"mandatory": 50, "preferred": 25, "experience": 15, "qualifications": 10}
            )
            db.add(crit1)

        # Job 2: Senior Full Stack Developer (Next.js & TypeScript)
        job2 = db.query(Job).filter(Job.title == "Full Stack Web Developer (Next.js)").first()
        if not job2:
            job2 = Job(
                title="Full Stack Web Developer (Next.js)",
                department="Product",
                description="Looking for a modern web engineer with strong Next.js, React, and TypeScript expertise to craft engaging user experiences.",
                responsibilities="Develop web client components, maintain design systems with Tailwind CSS, interface with backend APIs.",
                location="Remote",
                work_arrangement="Remote",
                created_by_id=admin.id
            )
            db.add(job2)
            db.flush()

            crit2 = ScreeningCriteria(
                job_id=job2.id,
                mandatory_skills=[
                    {"name": "React", "min_years": 2.0, "synonyms": ["react.js"]},
                    {"name": "Next.js", "min_years": 1.0, "synonyms": ["nextjs"]},
                    {"name": "TypeScript", "min_years": 2.0, "synonyms": ["ts"]},
                    {"name": "Tailwind CSS", "min_years": 1.0, "synonyms": ["tailwind"]}
                ],
                preferred_skills=[
                    {"name": "Node.js", "weight": 1.0, "synonyms": ["node"]},
                    {"name": "GraphQL", "weight": 1.0, "synonyms": ["gql"]},
                    {"name": "Git", "weight": 0.8, "synonyms": ["github"]}
                ],
                min_experience_years=2.0,
                required_qualifications=[
                    {"degree": "Bachelor", "field": "Any"}
                ],
                weights={"mandatory": 50, "preferred": 25, "experience": 15, "qualifications": 10}
            )
            db.add(crit2)

        db.commit()
        print("Sample jobs and screening criteria seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    generate_samples()
