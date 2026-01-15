(function ($) {
  $.fn.imageGallery = function (options) {
    const defaults = {
      maxFiles: 10,
      accept: "image/*",
      counterSelector: ".dropdown-label",
      containerSelector: ".form-gallery-wrapper",
      onChange: null,

      imageFolder: null,        
      existingFiles: []
    };

    return this.each(function () {
      const $container = $(this);
      const settings = $.extend({}, defaults, options);

      const $counter = $container.find(settings.counterSelector);
      const $wrapper = $container.find(settings.containerSelector);
      const $template = $wrapper.find(".form-gallery-wrapper-item").first();

      let files = [];

      // Инициализация
      init();

      function init() {
        $template.addClass("template-item");
        bindEvents();
        updateCounter();
        toggleTemplate();

        loadExistingImages();
      }

      function bindEvents() {
        // Клик по шаблону — добавление нового
        $wrapper.on("click", ".template-item", function () {
          if (files.length < settings.maxFiles) {
            $(this).find('input[type="file"]').click();
          }
        });

        // Клик по превью — замена
        $wrapper.on("click", ".form-gallery-wrapper-item:not(.template-item)", function (e) {
          // Проверяем, не кликнули ли по кнопке удаления
          if ($(e.target).closest(".form-gallery-wrapper-item-del").length) {
              return; // Не открываем file picker, если клик по "удалить"
          }

          // Кликаем по скрытому input'у внутри label
          const $input = $(this).find('input[type="file"]');
          $input.off('change').on('change', function() {
              const file = this.files[0];
              if (!file) return;

              const $item = $(this).closest(".form-gallery-wrapper-item");
              const index = $item.index() - 1; // -1 из-за шаблона

              // Проверка дубликата
              const isDuplicate = files.some(
                  (f, i) => i !== index && f.name === file.name && f.size === file.size && f.type === file.type
              );

              if (isDuplicate) {
                  alert(`Файл "${file.name}" уже добавлен.`);
                  return;
              }

              // Заменяем файл
              files[index] = file;

              // Обновляем превью
              const reader = new FileReader();
              reader.onload = function(e) {
                  $item.find(".form-gallery-img_preview").attr("src", e.target.result);
                  $item.find(".form-gallery-img_empty").hide();
              };
              reader.readAsDataURL(file);

              triggerChange();
          }).click(); // ← активируем input через клик по label
        });

        // Изменение файла
        $template.find('input[type="file"]').on("change", function (e) {
          const newFiles = Array.from(e.target.files);
          addFiles(newFiles);
          $(this).val("");
        });

        // Drag & Drop
        ["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
          $wrapper.on(event, function (e) {
            e.preventDefault();
            e.stopPropagation();
          });
        });

        $wrapper.on("dragover", function () {
          $wrapper.addClass("drag-over");
        });

        $wrapper.on("dragleave drop", function () {
          $wrapper.removeClass("drag-over");
        });

        $wrapper.on("drop", function (e) {
          const newFiles = Array.from(e.originalEvent.dataTransfer.files);
          const filtered = newFiles.filter((f) =>
            f.type.match(settings.accept)
          );
          addFiles(filtered);
        });

        // Удаление
        $wrapper.on("click", ".form-gallery-wrapper-item-del", function (e) {
          e.preventDefault();
          const $item = $(this).closest(".form-gallery-wrapper-item");
          const index = $item.index();

          if (index > 0) {
            // 0 — это шаблон
            files.splice(index - 1, 1); // удаляем из массива (шаблон не считается)
            $item.remove();
            updateCounter();
            triggerChange();
            toggleTemplate();
          }
        });
      }

      function toggleTemplate() {
        const $currentTemplate = $wrapper
          .find(".form-gallery-wrapper-item")
          .first();
        files.length >= settings.maxFiles
          ? $currentTemplate.hide()
          : $currentTemplate.show();
      }

      function addFiles(newFiles) {
        if (files.length >= settings.maxFiles) {
          alert(`Можно загрузить не более ${settings.maxFiles} файлов.`);
          return;
        }

        const remaining = settings.maxFiles - files.length;
        const toAdd = newFiles.slice(0, remaining);

        toAdd.forEach((file) => {
          if (isDuplicate(file)) {
            alert(`Файл "${file.name}" уже добавлен.`);
            return;
          }

          files.push(file);
          appendFileItem(file);
        });

        if (toAdd.length < newFiles.length) {
          alert(
            `Достигнут лимит. Только ${toAdd.length} из ${newFiles.length} добавлены.`
          );
        }

        updateCounter();
        triggerChange();
        toggleTemplate();
      }

      function isDuplicate(file) {
        return files.some(
          (f) => f.name === file.name && f.size === f.size && f.type === f.type
        );
      }

      function loadExistingImages() {
    if (!settings.imageFolder && settings.existingFiles.length === 0) return;

    const folder = settings.imageFolder || '';
    const filesToLoad = settings.existingFiles;

    filesToLoad.forEach(filename => {
        const url = folder + filename;

        fetch(url)
            .then(r => {
                if (!r.ok) throw new Error('File not found: ' + url);
                return r.blob();
            })
            .then(blob => {
                const file = new File([blob], filename, { type: blob.type });
                if (isDuplicate(file)) {
                    console.warn(`Пропущен дубль: ${filename}`);
                    return;
                }
                files.push(file);
                appendFileItem(file);
                triggerChange();
                updateCounter();
            })
            .catch(err => {
                console.error(err);
            });
    });
}

      function appendFileItem(file) {
        // const $item = $template.clone();
        const $item = $template.clone();        
        $item.removeClass("template-item");
        $wrapper.append($item);       
        const $input = $item.find('input[type="file"]');
        const $imgEmpty = $item.find(".form-gallery-img_empty");
        const $imgPreview = $item.find(".form-gallery-img_preview");
        const $delBtn = $item.find(".form-gallery-wrapper-item-del");

        $imgEmpty.hide();
        $imgPreview.show();

        const reader = new FileReader();
        reader.onload = function (e) {
          $imgPreview.attr("src", e.target.result);
        };
        reader.readAsDataURL(file);

        $item.show();
        $wrapper.append($item);
        $delBtn.css({
          'display': "flex",
        });
      }

      function updateCounter() {
        $counter.text(`${files.length} из ${settings.maxFiles}`);
      }

      function triggerChange() {
        if (typeof settings.onChange === "function") {
          settings.onChange(files);
        }
      }

      // Публичные методы
      $container.data("imageGallery", {
        getFiles: () => files,
        clear: () => {
          files = [];
          $wrapper.find(".form-gallery-wrapper-item").not(":first").remove();
          updateCounter();
          triggerChange();
        },
      });
    });
  };
})(jQuery);
