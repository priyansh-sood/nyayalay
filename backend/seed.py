"""
Seed script: inserts 15 realistic Indian cases + demo users.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, User, Case, UserRole, CaseStatus, Priority
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Demo users ─────────────────────────────────────────────────────────────────
USERS = [
    {
        "email": "judge@court.in",
        "full_name": "Hon'ble Justice Rajendra Kumar Mishra",
        "password": "Judge@123",
        "role": UserRole.judge,
    },
    {
        "email": "lawyer@court.in",
        "full_name": "Adv. Priya Sharma",
        "password": "Lawyer@123",
        "role": UserRole.lawyer,
    },
    {
        "email": "clerk@court.in",
        "full_name": "Sanjay Tiwari (Court Clerk)",
        "password": "Clerk@123",
        "role": UserRole.clerk,
    },
]

# ── Case seed data ─────────────────────────────────────────────────────────────
now = datetime.utcnow()


def d(days_ago=0):
    return now - timedelta(days=days_ago)


def nd(days_from_now=0):
    return now + timedelta(days=days_from_now)


CASES = [
    # 1 – Murder (IPC 302)
    {
        "case_number": "Sessions Case No. 45/2023",
        "court_name": "Additional Sessions Court, Saket, New Delhi",
        "judge_name": "Hon'ble Justice Rajendra Kumar Mishra",
        "petitioner": "State (Delhi Police)",
        "respondent": "Ramesh Kumar Yadav",
        "status": CaseStatus.active,
        "filing_date": d(300),
        "next_date": nd(3),
        "ipc_sections": "302, 34",
        "priority_score": 95.0,
        "priority": Priority.urgent,
        "description": "Murder of Suresh Yadav at Govindpuri, New Delhi. Accused allegedly killed victim over property dispute. Three eyewitnesses identified. Post-mortem report confirms death by strangulation.",
        "estimated_duration_minutes": 60,
    },
    # 2 – Culpable Homicide (IPC 304)
    {
        "case_number": "Sessions Case No. 112/2023",
        "court_name": "City Sessions Court, Mumbai",
        "judge_name": "Hon'ble Justice Meena Desai",
        "petitioner": "State of Maharashtra",
        "respondent": "Deepak Shankar Pawar",
        "status": CaseStatus.active,
        "filing_date": d(250),
        "next_date": nd(5),
        "ipc_sections": "304, 34",
        "priority_score": 88.0,
        "priority": Priority.urgent,
        "description": "Culpable homicide not amounting to murder. Accused assaulted victim Mohan Sawant in a drunken brawl at Dharavi. Victim died 48 hours later in Sion Hospital due to head injuries.",
        "estimated_duration_minutes": 45,
    },
    # 3 – Attempt to Murder (IPC 307)
    {
        "case_number": "Sessions Case No. 78/2024",
        "court_name": "Principal District and Sessions Court, Lucknow",
        "judge_name": "Hon'ble Justice Vikas Chandra Srivastava",
        "petitioner": "State of Uttar Pradesh",
        "respondent": "Mohammad Arif Khan",
        "status": CaseStatus.pending,
        "filing_date": d(120),
        "next_date": nd(2),
        "ipc_sections": "307, 120B, 34",
        "priority_score": 85.0,
        "priority": Priority.urgent,
        "description": "Attempt to murder. Victim Anil Gupta was shot at in broad daylight near Hazratganj Market. Accused allegedly part of organized gang. CCTV footage and ballistic report available.",
        "estimated_duration_minutes": 50,
    },
    # 4 – Hurt (IPC 324)
    {
        "case_number": "CC No. 892/2024",
        "court_name": "Chief Judicial Magistrate Court, Bengaluru",
        "judge_name": "Sri M. Suresh Kumar",
        "petitioner": "Kavitha Reddy",
        "respondent": "Suresh B. Nair",
        "status": CaseStatus.pending,
        "filing_date": d(80),
        "next_date": nd(10),
        "ipc_sections": "324, 506",
        "priority_score": 55.0,
        "priority": Priority.medium,
        "description": "Voluntarily causing hurt by dangerous weapons. Complainant Kavitha Reddy alleges accused attacked her with a knife during a neighbourhood dispute. Medical report shows laceration wounds on forearm.",
        "estimated_duration_minutes": 30,
    },
    # 5 – Common Intention (IPC 34)
    {
        "case_number": "Sessions Case No. 204/2023",
        "court_name": "District and Sessions Court, Patna",
        "judge_name": "Hon'ble Justice Santosh Kumar Singh",
        "petitioner": "State of Bihar",
        "respondent": "Vijay Prasad Singh & Ors",
        "status": CaseStatus.active,
        "filing_date": d(400),
        "next_date": nd(7),
        "ipc_sections": "302, 34, 120B",
        "priority_score": 90.0,
        "priority": Priority.urgent,
        "description": "Murder with common intention. Three accused persons allegedly attacked rival faction leader Ramlal Yadav with firearms and sharp weapons. Accused nos. 1 and 3 are absconding.",
        "estimated_duration_minutes": 60,
    },
    # 6 – Criminal Conspiracy (IPC 120B)
    {
        "case_number": "CBI RC No. 04/2022",
        "court_name": "Special CBI Court, Patiala House Courts, New Delhi",
        "judge_name": "Spl. Judge Rajiv Saxena",
        "petitioner": "Central Bureau of Investigation",
        "respondent": "Harbans Lal Gujral & Anr",
        "status": CaseStatus.active,
        "filing_date": d(600),
        "next_date": nd(14),
        "ipc_sections": "120B, 420, 406, 477A",
        "priority_score": 75.0,
        "priority": Priority.high,
        "description": "Criminal conspiracy to defraud public sector banks. Accused allegedly conspired to divert Rs 450 crore in agricultural loans through shell companies. SFIO report and chartered accountant testimony scheduled.",
        "estimated_duration_minutes": 90,
    },
    # 7 – Cheating (IPC 420)
    {
        "case_number": "CC No. 1245/2023",
        "court_name": "Metropolitan Magistrate Court, Dwarka, New Delhi",
        "judge_name": "Sri Arun Mohan",
        "petitioner": "Smt. Anita Verma",
        "respondent": "Rajiv Bhatia",
        "status": CaseStatus.pending,
        "filing_date": d(150),
        "next_date": nd(20),
        "ipc_sections": "420, 406",
        "priority_score": 45.0,
        "priority": Priority.medium,
        "description": "Cheating and criminal breach of trust. Complainant alleges accused collected Rs 8 lakh as advance for property sale in Dwarka Sector 12 and failed to execute sale deed. Title documents forged.",
        "estimated_duration_minutes": 30,
    },
    # 8 – Criminal Breach of Trust (IPC 406)
    {
        "case_number": "CC No. 567/2024",
        "court_name": "Judicial Magistrate First Class, Pune",
        "judge_name": "Sri Santosh Joshi",
        "petitioner": "Bajaj Finance Ltd.",
        "respondent": "Nikhil Ramesh Kulkarni",
        "status": CaseStatus.pending,
        "filing_date": d(60),
        "next_date": nd(25),
        "ipc_sections": "406, 420",
        "priority_score": 40.0,
        "priority": Priority.low,
        "description": "Criminal breach of trust by company's regional manager. Rs 22 lakh in EMI collections not deposited into company accounts. Accused claims amounts were adjusted against legitimate expenses.",
        "estimated_duration_minutes": 25,
    },
    # 9 – Rape (IPC 376)
    {
        "case_number": "POCSO Case No. 38/2023",
        "court_name": "Special POCSO Court, Chennai",
        "judge_name": "Hon'ble Justice S. Kavitha",
        "petitioner": "State of Tamil Nadu",
        "respondent": "G. Murugesan",
        "status": CaseStatus.active,
        "filing_date": d(350),
        "next_date": nd(4),
        "ipc_sections": "376, 354, 506",
        "priority_score": 92.0,
        "priority": Priority.urgent,
        "description": "Rape and outraging modesty case. Victim is a minor aged 14. DNA evidence secured. Medical examination corroborates the complaint. Witness protection order in force. In-camera proceedings underway.",
        "estimated_duration_minutes": 75,
    },
    # 10 – Outraging Modesty (IPC 354)
    {
        "case_number": "CC No. 2134/2024",
        "court_name": "Additional Chief Metropolitan Magistrate, Esplanade, Mumbai",
        "judge_name": "Smt. Rekha Gokhale",
        "petitioner": "Ms. Preeti Shinde",
        "respondent": "Rakesh Dnyaneshwar More",
        "status": CaseStatus.pending,
        "filing_date": d(45),
        "next_date": nd(30),
        "ipc_sections": "354, 354A, 509",
        "priority_score": 60.0,
        "priority": Priority.high,
        "description": "Outraging modesty of woman. Complainant, a 28-year-old software professional, alleges accused followed her and made inappropriate gestures/remarks near CST railway station. CCTV footage recovered.",
        "estimated_duration_minutes": 30,
    },
    # 11 – Arms Act + 302
    {
        "case_number": "Sessions Case No. 91/2022",
        "court_name": "Additional Sessions Court, Jaipur",
        "judge_name": "Hon'ble Justice Prakash Chandra Sharma",
        "petitioner": "State of Rajasthan",
        "respondent": "Ajay Singh Rathore & Anr",
        "status": CaseStatus.adjourned,
        "filing_date": d(700),
        "next_date": nd(6),
        "ipc_sections": "302, 120B, 34",
        "priority_score": 85.0,
        "priority": Priority.urgent,
        "description": "Double murder case in Sikar district. Honour killing – two deceased were found hanging. Prosecution alleges staged suicide by accused family members. Forensic evidence shows ligature marks inconsistent with self-hanging.",
        "estimated_duration_minutes": 60,
    },
    # 12 – Corporate Fraud
    {
        "case_number": "CC No. 478/2023",
        "court_name": "Special Court under Companies Act, Hyderabad",
        "judge_name": "Sri K. Venkata Rao",
        "petitioner": "Ministry of Corporate Affairs",
        "respondent": "M/s Sunrise Technologies Ltd. & Ors",
        "status": CaseStatus.active,
        "filing_date": d(500),
        "next_date": nd(18),
        "ipc_sections": "420, 120B, 406",
        "priority_score": 65.0,
        "priority": Priority.high,
        "description": "Corporate fraud and insider trading. Promoters of listed company allegedly manipulated quarterly financial results causing Rs 90 crore losses to investors. SEBI investigation report submitted as Exhibit A.",
        "estimated_duration_minutes": 45,
    },
    # 13 – Dowry Death (IPC 302/304B)
    {
        "case_number": "Sessions Case No. 156/2024",
        "court_name": "Fast Track Court, Kanpur",
        "judge_name": "Hon'ble Justice Neelam Agarwal",
        "petitioner": "State of Uttar Pradesh (on complaint of Ramkali Devi)",
        "respondent": "Manoj Kumar Tripathi & Anr",
        "status": CaseStatus.pending,
        "filing_date": d(90),
        "next_date": nd(1),
        "ipc_sections": "302, 304B, 498A, 34",
        "priority_score": 93.0,
        "priority": Priority.urgent,
        "description": "Dowry death / murder of Smt. Sunita Tripathi (age 24). Deceased found with burn injuries within 7 years of marriage. Husband and mother-in-law accused of persistent dowry harassment. Post-mortem and viscera report obtained.",
        "estimated_duration_minutes": 75,
    },
    # 14 – Drug Trafficking (NDPS Act)
    {
        "case_number": "NDPS Case No. 23/2024",
        "court_name": "Special NDPS Court, Amritsar",
        "judge_name": "Sri Harpreet Singh Bedi",
        "petitioner": "NCB / State of Punjab",
        "respondent": "Gurpreet Singh & 2 Ors",
        "status": CaseStatus.active,
        "filing_date": d(200),
        "next_date": nd(12),
        "ipc_sections": "120B, 34",
        "priority_score": 70.0,
        "priority": Priority.high,
        "description": "Drug trafficking – seizure of 12 kg heroin near Attari border. Accused apprehended by BSF in joint operation. Forensic lab report confirms narcotic substance. Bail denied under NDPS Section 37.",
        "estimated_duration_minutes": 45,
    },
    # 15 – Corruption (PC Act)
    {
        "case_number": "ACB RC No. 07/2023",
        "court_name": "Special ACB Court, Bhopal",
        "judge_name": "Sri R.C. Gupta",
        "petitioner": "Anti-Corruption Bureau, Madhya Pradesh",
        "respondent": "Shri Dinesh Prasad Tiwari (IAS Retd.)",
        "status": CaseStatus.active,
        "filing_date": d(450),
        "next_date": nd(9),
        "ipc_sections": "420, 120B",
        "priority_score": 68.0,
        "priority": Priority.high,
        "description": "Disproportionate assets case against retired IAS officer. Assets worth Rs 4.2 crore alleged to be beyond known income sources. Properties registered in wife's and son's names. I-T returns and property documents seized.",
        "estimated_duration_minutes": 40,
    },
]


def seed():
    print("Creating database tables…")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Users ─────────────────────────────────────────────────────────────
        created_users = {}
        for u in USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=pwd_context.hash(u["password"]),
                    role=u["role"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                created_users[u["email"]] = user
                print(f"  Created user: {u['email']} ({u['role']})")
            else:
                created_users[u["email"]] = existing
                print(f"  User exists: {u['email']}")

        judge_user = created_users.get("judge@court.in")

        # ── Cases ─────────────────────────────────────────────────────────────
        for c in CASES:
            existing = db.query(Case).filter(Case.case_number == c["case_number"]).first()
            if not existing:
                case = Case(
                    **c,
                    assigned_user_id=judge_user.id if judge_user else None,
                )
                db.add(case)
                db.commit()
                print(f"  Created case: {c['case_number']}")
            else:
                print(f"  Case exists: {c['case_number']}")

        print("\n✅ Seed complete!")
        print("\nDemo credentials:")
        for u in USERS:
            print(f"  {u['role'].value}: {u['email']} / {u['password']}")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
