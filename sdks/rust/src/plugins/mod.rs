//! Plugin system for extending SDK functionality

pub mod system;
pub mod traits;
pub mod config;

pub use system::PluginSystem;
pub use traits::Plugin;
pub use config::PluginConfig;
