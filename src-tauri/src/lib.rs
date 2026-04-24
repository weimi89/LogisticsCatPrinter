use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

fn last_path_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or_else(|| "取得 app config dir 失敗".to_string())?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("建立 app config dir 失敗: {e}"))?;
    }
    Ok(dir.join("last_path.txt"))
}

#[tauri::command]
fn read_config(path: String) -> Result<Value, String> {
    let text = fs::read_to_string(&path).map_err(|e| format!("讀檔失敗 {path}: {e}"))?;
    serde_json::from_str::<Value>(&text).map_err(|e| format!("JSON 解析失敗: {e}"))
}

#[tauri::command]
fn write_config(path: String, data: Value) -> Result<(), String> {
    let pretty = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("JSON 序列化失敗: {e}"))?;
    fs::write(&path, pretty).map_err(|e| format!("寫檔失敗 {path}: {e}"))?;
    Ok(())
}

#[tauri::command]
fn restart_service(config_path: String) -> Result<String, String> {
    let cfg = PathBuf::from(&config_path);
    let dir = cfg
        .parent()
        .ok_or_else(|| format!("無法取得 {config_path} 的父目錄"))?;
    let script = dir.join("c4000.sh");
    if !script.exists() {
        return Err(format!("找不到重啟腳本: {}", script.display()));
    }
    let output = Command::new("bash")
        .arg(&script)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("執行 {} 失敗: {e}", script.display()))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() {
        Ok(format!("{stdout}{stderr}").trim().to_string())
    } else {
        Err(format!(
            "{} 失敗 (exit {:?}): {}{}",
            script.display(),
            output.status.code(),
            stdout,
            stderr
        ))
    }
}

#[tauri::command]
fn get_last_path(app: AppHandle) -> Result<Option<String>, String> {
    let file = last_path_file(&app)?;
    if !file.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&file)
        .map_err(|e| format!("讀取 last_path 失敗: {e}"))?
        .trim()
        .to_string();
    if content.is_empty() {
        Ok(None)
    } else {
        Ok(Some(content))
    }
}

#[tauri::command]
fn set_last_path(app: AppHandle, path: String) -> Result<(), String> {
    let file = last_path_file(&app)?;
    fs::write(&file, path).map_err(|e| format!("寫入 last_path 失敗: {e}"))?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_config,
            write_config,
            restart_service,
            get_last_path,
            set_last_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
