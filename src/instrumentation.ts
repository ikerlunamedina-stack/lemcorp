// Instrumentación global — se ejecuta al iniciar el servidor
// Captura errores no manejados para evitar que el proceso se caiga

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      console.error('[LEMCORP] Uncaught Exception (no se caerá):', err.message);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[LEMCORP] Unhandled Rejection (no se caerá):', reason);
    });

    process.on('SIGTERM', () => {
      console.log('[LEMCORP] SIGTERM recibido — ignorando');
    });

    // Prevenir exit por errores
    process.on('exit', (code) => {
      console.log(`[LEMCORP] Process exit con código ${code}`);
    });
  }
}
