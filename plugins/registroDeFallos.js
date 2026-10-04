const { withMainApplication } = require("expo/config-plugins");

/**
 * Diagnóstico de cierres inesperados sin conectar el teléfono al computador: si la app se cae
 * (error nativo o de JavaScript), abre el menú Compartir de Android con el detalle del error,
 * listo para enviarlo por WhatsApp o correo. El menú es del sistema, así que sigue abierto
 * aunque la app ya se haya cerrado.
 */
const MARCA = "// registroDeFallos";

const CODIGO = `
    ${MARCA}
    val manejadorPrevio = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { hilo, error ->
      try {
        val detalle = "Error de VentanaGo\\n" +
          "Android " + android.os.Build.VERSION.RELEASE + " (API " + android.os.Build.VERSION.SDK_INT + ") · " +
          android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL + " · " + android.os.Build.SUPPORTED_ABIS.joinToString() +
          "\\n\\n" + android.util.Log.getStackTraceString(error).take(6000)
        val enviar = android.content.Intent(android.content.Intent.ACTION_SEND)
          .setType("text/plain")
          .putExtra(android.content.Intent.EXTRA_TEXT, detalle)
        startActivity(
          android.content.Intent.createChooser(enviar, "VentanaGo se cerró: enviar el detalle del error")
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        // Tiempo para que Android abra el menú antes de cerrar la app.
        Thread.sleep(800)
      } catch (_: Throwable) {
      }
      manejadorPrevio?.uncaughtException(hilo, error)
    }
`;

module.exports = function registroDeFallos(config) {
    return withMainApplication(config, (cfg) => {
        const contenido = cfg.modResults.contents;
        if (contenido.includes(MARCA)) return cfg;
        const ancla = "super.onCreate()";
        if (!contenido.includes(ancla)) throw new Error("registroDeFallos: no se encontró super.onCreate() en MainApplication");
        cfg.modResults.contents = contenido.replace(ancla, `${ancla}\n${CODIGO}`);
        return cfg;
    });
};
