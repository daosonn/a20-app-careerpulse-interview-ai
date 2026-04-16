(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var searchInput = document.querySelector("#changelist-search input[type='text']");

    document.addEventListener("keydown", function (event) {
      if (event.key === "/" && searchInput && document.activeElement !== searchInput) {
        var target = document.activeElement;
        var isTypingElement = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (!isTypingElement) {
          event.preventDefault();
          searchInput.focus();
        }
      }
    });
  });
})();
