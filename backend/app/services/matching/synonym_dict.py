from typing import Dict, List

DEFAULT_SYNONYMS: Dict[str, List[str]] = {
    "python": ["py", "python3", "python 3", "cpython"],
    "javascript": ["js", "ecmascript", "es6", "vanilla js", "vanillajs"],
    "typescript": ["ts"],
    "react": ["react.js", "reactjs"],
    "next.js": ["nextjs", "next.js app router", "next"],
    "fastapi": ["fast api", "fastapi framework"],
    "django": ["django rest framework", "drf"],
    "node.js": ["nodejs", "node js", "node"],
    "docker": ["containerization", "containers", "dockerfile", "docker-compose"],
    "kubernetes": ["k8s", "k8", "kube", "kubectl"],
    "postgresql": ["postgres", "pgsql", "psql"],
    "mongodb": ["mongo", "nosql"],
    "redis": ["redis cache", "in-memory cache"],
    "aws": ["amazon web services", "aws cloud", "ec2", "s3", "lambda", "ecs"],
    "gcp": ["google cloud", "google cloud platform", "google compute engine"],
    "azure": ["microsoft azure", "azure cloud"],
    "ci/cd": ["continuous integration", "continuous deployment", "cicd", "github actions", "gitlab ci", "jenkins"],
    "rest api": ["restful api", "rest", "restful web services", "rest apis"],
    "graphql": ["gql", "apollo graphql"],
    "git": ["github", "gitlab", "bitbucket", "version control"],
    "machine learning": ["ml", "statistical learning", "predictive modeling"],
    "deep learning": ["neural networks", "dl", "ann", "cnn", "rnn", "transformers"],
    "nlp": ["natural language processing", "text mining", "llm"],
    "sql": ["structured query language", "rdbms", "relational database"],
    "agile": ["scrum", "kanban", "sprint planning"],
    "tailwind css": ["tailwind", "tailwindcss"],
    "vue.js": ["vue", "vuejs"],
    "angular": ["angularjs", "angular 2+"]
}

def get_synonyms_for(skill_name: str) -> List[str]:
    skill_lower = skill_name.strip().lower()
    return DEFAULT_SYNONYMS.get(skill_lower, [])
