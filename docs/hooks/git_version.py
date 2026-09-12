import logging
import subprocess


def on_page_markdown(markdown, page, config, files):
    file_path = page.file.abs_src_path
    try:
        count = subprocess.check_output(
            ["git", "rev-list", "--count", "HEAD", "--", file_path], 
            text=True, stderr=subprocess.DEVNULL
        ).strip()
        
        commit_hash = subprocess.check_output(
            ["git", "log", "-1", "--format=%h", "--", file_path],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
        
        if count and commit_hash:
            page.meta['git_version_count'] = count
            page.meta['git_version_hash'] = commit_hash
    except subprocess.CalledProcessError as e:
        logging.getLogger("mkdocs.hooks.git_version").debug("Failed to get git version for %s: %s", file_path, e)
    
    return markdown
