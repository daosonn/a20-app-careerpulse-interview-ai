import os
import sys
import time
import logging
import json
import random
import datetime
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from pathlib import Path

# --- IDE & PROJECT PATH SETUP ---
# Ensure the 'backend' directory is in sys.path so 'app.xxx' imports work
current_file = Path(__file__).resolve()
backend_path = current_file.parents[3] # unified_crawler.py -> auto_crawl_data -> rag_service -> app -> backend
if str(backend_path) not in sys.path:
    sys.path.append(str(backend_path))

from app.core.config import PROJECT_ROOT, LOGS_DIR, DATA_DIR

def init_logging():
    # Clear existing handlers to prevent duplicate logs
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
        
    log_file = LOGS_DIR / "topcv_unified.log"
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%H:%M:%S',
        force=True, # Ensure it overrides any existing config
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def get_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    driver.set_page_load_timeout(60)
    return driver

# Global function removed as it is now a class method

def extract_job_detail(driver, url, category_name):
    try:
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.CLASS_NAME, "job-detail__body")))
    except TimeoutException:
        return None

    job_id = url.split('/')[-1].split('.')[0]
    job_data = {
        "url": url,
        "scraped_at": datetime.datetime.now().isoformat(),
        "metadata": {
            "category": category_name,
            "job_title": None,
            "company_name": None,
            "company_scale": None,
            "company_field": None,
            "company_address": None,
            "salary": None,
            "location": None,
            "experience": None,
            "deadline": None,
            "tags": []
        },
        "content": {
            "job_description": None,
            "job_requirement": None,
            "job_benefit": None,
            "working_location": None,
            "working_time": None,
            "application_method": None
        }
    }

    try:
        show_more_btn = driver.find_element(By.XPATH, "//button[contains(., 'Xem đầy đủ mô tả công việc')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", show_more_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", show_more_btn)
        time.sleep(1)
    except NoSuchElementException:
        pass

    js_extract_script = """
    var getVal = (selector) => {
        var el = document.querySelector(selector);
        return el ? el.textContent.replace(/\\n/g, ' ').replace(/\\s{2,}/g, ' ').trim() : null;
    };
    var title = null;
    var h1 = document.querySelector('h1.job-detail__info--title');
    if (h1) {
        var clone = h1.cloneNode(true);
        var badges = clone.querySelectorAll('.icon-verified-employer, span, i');
        badges.forEach(b => b.remove());
        title = clone.textContent.replace(/\\n/g, ' ').replace(/\\s{2,}/g, ' ').trim();
    }
    var companyName = getVal('.job-detail__company--information-item.company-name .name') || getVal('.company-name-label .name');
    var companyScale = getVal('.job-detail__company--information-item.company-scale .company-value');
    var companyField = getVal('.job-detail__company--information-item.company-field .company-value');
    var companyAddress = getVal('.job-detail__company--information-item.company-address .company-value');
    var tags = [];
    document.querySelectorAll('.job-tags a, .job-tags span.search-from-tag, .box-category .item-category').forEach(t => {
        var txt = t.textContent.trim();
        if(txt) tags.push(txt);
    });
    var contentDict = {};
    var items = document.querySelectorAll('.job-description__item');
    if (items.length > 0) {
        items.forEach(item => {
            var hTitleElem = item.querySelector('h2, h3, h4');
            if (!hTitleElem) return;
            var hTitle = hTitleElem.textContent.toLowerCase();
            var cElem = item.querySelector('.job-description__item--content');
            var cText = cElem ? cElem.textContent.trim() : item.textContent.trim(); 
            if (hTitle.includes('mô tả')) contentDict['job_description'] = cText;
            else if (hTitle.includes('yêu cầu')) contentDict['job_requirement'] = cText;
            else if (hTitle.includes('quyền lợi')) contentDict['job_benefit'] = cText;
            else if (hTitle.includes('địa điểm')) contentDict['working_location'] = cText;
            else if (hTitle.includes('thời gian')) contentDict['working_time'] = cText;
            else if (hTitle.includes('cách thức')) contentDict['application_method'] = cText;
        });
    }
    var fullContent = null;
    if (Object.keys(contentDict).length === 0) {
        var fullElem = document.querySelector('.job-detail__information-detail--content');
        if (fullElem) { fullContent = fullElem.textContent.trim(); }
    }
    return {
        title: title, companyName: companyName, companyScale: companyScale,
        companyField: companyField, companyAddress: companyAddress,
        salary: getVal('.section-salary .job-detail__info--section-content-value'),
        location: getVal('.section-location .job-detail__info--section-content-value'),
        experience: getVal('.section-experience .job-detail__info--section-content-value'),
        deadline: getVal('.job-detail__info--deadline-date'),
        tags: tags, contentDict: contentDict, fullContent: fullContent
    };
    """
    try:
        extracted = driver.execute_script(js_extract_script)
        job_data["metadata"].update({
            "job_title": extracted.get("title"),
            "company_name": extracted.get("companyName"),
            "company_scale": extracted.get("companyScale"),
            "company_field": extracted.get("companyField"),
            "company_address": extracted.get("companyAddress"),
            "salary": extracted.get("salary"),
            "location": extracted.get("location"),
            "experience": extracted.get("experience"),
            "deadline": extracted.get("deadline"),
            "tags": extracted.get("tags") or []
        })
        content_dict = extracted.get("contentDict", {})
        for k in job_data["content"].keys():
            if k in content_dict:
                job_data["content"][k] = content_dict[k]
        if not job_data["content"]["job_description"] and extracted.get("fullContent"):
            job_data["content"]["job_description"] = extracted.get("fullContent")
    except Exception as e:
        logging.error(f"[{job_id}] Error JS Extract: {e}")
    return job_data

class UnifiedCrawler:
    def __init__(self, data_dir=None):
        self.project_root = PROJECT_ROOT
        
        # Use centralized DATA_DIR if none provided
        self.data_dir = Path(data_dir) if data_dir else DATA_DIR
        self.partitions_dir = self.data_dir / "partitions"
        self.seen_urls_path = self.data_dir / "seen_urls.json"
        
        self.partitions_dir.mkdir(parents=True, exist_ok=True)
        self.seen_urls = self._load_seen_urls()

    def _load_seen_urls(self):
        if self.seen_urls_path.exists():
            with open(self.seen_urls_path, "r", encoding="utf-8") as f:
                return set(json.load(f))
        return set()

    def _save_seen_urls(self):
        with open(self.seen_urls_path, "w", encoding="utf-8") as f:
            json.dump(list(self.seen_urls), f, ensure_ascii=False, indent=4)

    def get_partition_path_by_deadline(self, deadline_str):
        """
        Xác định path partition dựa trên deadline. 
        Định dạng deadline TopCV thường là: "Hạn nộp: 15/05/2026" hoặc "15/05/2026"
        """
        target_date = None
        if deadline_str:
            try:
                # Tìm chuỗi dd/mm/yyyy
                match = re.search(r'(\d{2})/(\d{2})/(\d{4})', deadline_str)
                if match:
                    d, m, y = match.groups()
                    target_date = datetime.date(int(y), int(m), int(d))
            except:
                pass
        
        # Nếu không có deadline hoặc không parse được, dùng ngày hiện tại (scraped date) làm fallback
        if not target_date:
            target_date = datetime.date.today()
            
        year, week, _ = target_date.isocalendar()
        filename = f"jobs_{year}_W{week:02d}.json"
        return self.partitions_dir / filename

    def save_job_to_partition(self, job_data):
        deadline = job_data.get("metadata", {}).get("deadline")
        partition_path = self.get_partition_path_by_deadline(deadline)
        data = []
        if partition_path.exists():
            try:
                with open(partition_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except:
                data = []
        data.append(job_data)
        with open(partition_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

    # --- PHẦN HÀM MỚI: Xử lý bù tham số URL ---
    def fix_pagination_url(self, next_url, original_url):
        """Bổ sung các tham số sort và keyword bị thiếu từ trang 2 trở đi"""
        target_parts = list(urlparse(next_url))
        original_parts = urlparse(original_url)
        target_query = parse_qs(target_parts[4])
        original_query = parse_qs(original_parts.query)

        for key in ['sort', 'type_keyword']:
            if key in original_query and key not in target_query:
                target_query[key] = original_query[key]

        target_parts[4] = urlencode(target_query, doseq=True)
        return urlunparse(target_parts)

    def run(self, categories, max_pages=5):
        new_jobs_found = {} # url -> category_name
        
        # BƯỚC 1: LẤY DANH SÁCH LINK TỪ CÁC TRANG TÌM KIẾM
        for cat_name, base_url in categories.items():
            logging.info(f"--- BẮT ĐẦU CÀO LINK NHÓM: {cat_name} ---")
            current_url = base_url
            page_count = 1
            
            while page_count <= max_pages:
                logging.info(f"Đang xử lý trang {page_count}: {current_url}")
                
                # Vòng lặp retry xử lý timeout/kết nối
                success = False
                driver = None
                for retry in range(3):
                    try:
                        driver = get_driver()
                        time.sleep(4)
                        driver.get(current_url)
                        
                        # BƯỚC A: Chỉ cần đợi cái khung (container) xuất hiện là được
                        WebDriverWait(driver, 15).until(
                            EC.presence_of_element_located((By.CLASS_NAME, "job-list-search-result"))
                        )
                        success = True
                        break
                    except Exception as e:
                        logging.warning(f"Lỗi/Timeout lần {retry + 1} tại trang {page_count}. Đang thử lại...")
                        if driver:
                            driver.quit()
                        time.sleep(random.uniform(7, 12))
                        
                if not success:
                    logging.error(f"Bỏ qua trang {page_count} do lỗi kết nối.")
                    break

                try:
                    # BƯỚC B: Cuộn trang từ từ TRƯỚC để kích hoạt Lazy Load (API gọi data)
                    for i in range(1, 6):
                        driver.execute_script(f"window.scrollTo(0, document.body.scrollHeight * {i / 5});")
                        time.sleep(1) # Delay nhẹ để JS kịp bắt sự kiện cuộn

                    # BƯỚC C: Sau khi cuộn, ÉP Selenium phải chờ danh sách chính tải ra (>10 jobs)
                    try:
                        WebDriverWait(driver, 10).until(
                            lambda d: len(d.find_elements(By.CLASS_NAME, "job-item-search-result")) > 10
                        )
                    except TimeoutException:
                        logging.info(f"Trang {page_count} có thể có ít hơn 10 jobs hoặc mạng chậm, tiếp tục xử lý...")
                        pass
                    
                    # Chờ thêm 2 giây tĩnh để trình duyệt kịp render các thẻ <a> bên trong item
                    time.sleep(2)

                    # BƯỚC D: Trích xuất link (Giữ nguyên code trích xuất của bạn)
                    try:
                        containers = driver.find_elements(By.CLASS_NAME, "job-list-search-result")
                        
                        page_new_links = 0
                        page_total_elements = 0 
                        page_seen_links = 0      
                        
                        for container in containers:
                            items = container.find_elements(By.CLASS_NAME, "job-item-search-result")
                            page_total_elements += len(items) 
                            
                            for item in items:
                                try:
                                    # Lấy link từ thẻ <a> nằm trong div class avatar hoặc title của item
                                    link_elements = item.find_elements(By.TAG_NAME, "a")
                                    raw_link = None
                                    for a in link_elements:
                                        href = a.get_attribute("href")
                                        if href and ("/viec-lam/" in href or "/brand/" in href):
                                            raw_link = href.split('?')[0]
                                            break
                                    
                                    if raw_link:
                                        if raw_link in self.seen_urls:
                                            # Link đã tồn tại trong database seen_urls.json
                                            page_seen_links += 1
                                        elif raw_link not in new_jobs_found:
                                            # Link hoàn toàn mới
                                            new_jobs_found[raw_link] = cat_name
                                            page_new_links += 1
                                except: 
                                    continue
                        
                        # LOG CHI TIẾT ĐỂ DEBUG
                        total_cat = len([u for u, c in new_jobs_found.items() if c == cat_name])
                        logging.info(
                            f"Trang {page_count}: "
                            f"Quét được {page_total_elements} jobs trên DOM | "
                            f"Đã trùng (seen): {page_seen_links} | "
                            f"Lọc được {page_new_links} link mới. "
                            f"Tổng nhóm {cat_name}: {total_cat}"
                        )
                        
                    except Exception as e:
                        logging.error(f"Lỗi khi trích xuất link tại trang {page_count}: {e}")
                        break

                    # Tìm link trang tiếp theo
                    try:
                        pagination_nav = driver.find_element(By.CLASS_NAME, "box-pagination")
                        next_button = pagination_nav.find_element(By.CSS_SELECTOR, "a[rel='next']")
                        raw_next_url = next_button.get_attribute("data-href") or next_button.get_attribute("href")
                        
                        if raw_next_url and page_count < max_pages:
                            current_url = self.fix_pagination_url(raw_next_url, base_url)
                            page_count += 1
                            time.sleep(random.uniform(4, 7))
                        else:
                            logging.info(f"Da dat gioi han trang hoac trang cuoi cung cua nhom {cat_name}.")
                            break
                    except NoSuchElementException:
                        logging.info(f"Khong thay nut Next - Ket thuc nhom {cat_name}.")
                        break
                        
                finally:
                    if driver:
                        driver.quit()
                    time.sleep(random.uniform(2, 4))

        # BƯỚC 2: CÀO CHI TIẾT TỪNG JOB
        logging.info(f"Tong cong tim thay {len(new_jobs_found)} Job moi. Bat dau cao chi tiet...")
        if new_jobs_found:
            for idx, (url, cat_name) in enumerate(new_jobs_found.items()):
                logging.info(f"[{idx+1}/{len(new_jobs_found)}] Detailing: {url}")
                detail_driver = get_driver()
                try:
                    detail_driver.get(url)
                    time.sleep(random.uniform(7, 10)) # Tăng delay an toàn
                    job_data = extract_job_detail(detail_driver, url, cat_name)
                    if job_data:
                        self.save_job_to_partition(job_data)
                        self.seen_urls.add(url)
                        
                        # LƯU ĐỊNH KỲ: Sau mỗi 10 job hoặc khi kết thúc danh sách
                        if (idx + 1) % 10 == 0 or (idx + 1) == len(new_jobs_found):
                            self._save_seen_urls()
                            logging.info(f"== CHECKPOINT == Da luu seen_urls tai job thu {idx+1}/{len(new_jobs_found)}")
                except Exception as e:
                    logging.error(f"Failed {url}: {e}")
                finally:
                    detail_driver.quit()
                time.sleep(random.uniform(1.5, 3))
        logging.info("Unified crawl completed.")
if __name__ == "__main__":
    init_logging()
    categories = {
        "AI": "https://www.topcv.vn/tim-viec-lam-artificial-intelligence-ai-cr257cb260?sort=new&type_keyword=1",
        "Software": "https://www.topcv.vn/tim-viec-lam-software-engineering-cr257cb258?sort=new&type_keyword=1",
        "Data": "https://www.topcv.vn/tim-viec-lam-data-science-cr257cb261?sort=new&type_keyword=1"
    }
    crawler = UnifiedCrawler()
    crawler.run(categories)
