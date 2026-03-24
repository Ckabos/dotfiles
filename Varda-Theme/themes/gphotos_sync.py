import requests
import re
import os

# CONFIGURACIÓN
# Usa el link corto de "Compartir" (el de photos.app.goo.gl)
ALBUM_URL = "https://photos.app.goo.gl/h7EE46K7qDgLpQUv9"
DEST_DIR = "/home/efrain/Imágenes/Wallpapers/Remote"

def sync_album():
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)

    print(f"[*] Conectando con el álbum...")
    try:
        response = requests.get(ALBUM_URL, timeout=15)
        response.raise_for_status()
        
        # Regex para encontrar las URLs de las fotos (formato de Google Photos)
        # Buscamos patrones que empiezan con las cabeceras de imagen de Google
        pattern = r'https://lh3\.googleusercontent\.com/pw/[^"\'\s=]+'
        matches = list(set(re.findall(pattern, response.text)))
        
        print(f"[+] Se encontraron {len(matches)} posibles imágenes.")

        for i, url in enumerate(matches):
            # Forzamos la máxima resolución añadiendo parámetros de tamaño al final
            # =w1920-h1080 es suficiente, pero =w0 descarga el original
            full_res_url = f"{url}=w2560-h1440"
            img_path = os.path.join(DEST_DIR, f"gphoto_{i}.jpg")
            
            print(f"[*] Descargando imagen {i+1}...")
            img_data = requests.get(full_res_url).content
            
            with open(img_path, "wb") as f:
                f.write(img_data)
        
        print("[!] Sincronización finalizada con éxito.")

    except Exception as e:
        print(f"[!] Error crítico: {e}")

if __name__ == "__main__":
    sync_album()
