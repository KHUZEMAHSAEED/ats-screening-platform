import concurrent.futures
import logging
from app.services.queue.tasks import process_resume_document_task

logger = logging.getLogger(__name__)

# Reusable executor for async processing in FastAPI
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def dispatch_resume_task(
    resume_id: str,
    job_id: str,
    application_id: str,
    user_id: str = None
):
    """
    Submits processing task to the worker pool.
    """
    try:
        executor.submit(
            process_resume_document_task,
            resume_id=resume_id,
            job_id=job_id,
            application_id=application_id,
            user_id=user_id
        )
    except Exception as e:
        logger.error(f"Failed to submit resume task: {str(e)}")
        # Run synchronously as last-ditch fallback
        process_resume_document_task(
            resume_id=resume_id,
            job_id=job_id,
            application_id=application_id,
            user_id=user_id
        )
