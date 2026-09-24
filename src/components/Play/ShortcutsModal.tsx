import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Z  /  U', action: 'Đi lại nước cờ (Undo)', desc: 'Hoàn tác 1 lượt đi của bạn và đối thủ' },
    { key: 'H', action: 'Gợi ý nước đi (Hint)', desc: 'AI tính toán và chọn quân/nước đi tối ưu nhất' },
    { key: 'N', action: 'Bắt đầu ván mới (New Game)', desc: 'Tạo ván cờ mới từ đầu' },
    { key: 'F', action: 'Đảo góc nhìn bàn cờ (Flip)', desc: 'Đổi góc nhìn từ phía Đỏ hoặc phía Đen' },
    { key: 'P', action: 'Bật/Tắt xem trước nước đi', desc: 'Ẩn hoặc hiện các chấm tròn và vòng nhắm ăn quân' },
    { key: 'Esc', action: 'Hủy chọn quân / Đóng hộp thoại', desc: 'Bỏ chọn ô đang chọn hoặc đóng bảng' },
    { key: '?', action: 'Mở bảng phím tắt', desc: 'Hiển thị danh sách phím tắt tiện dụng' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⌨️ Phím Tắt Tiện Dụng (Shortcuts)</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-body">
          <p className="shortcuts-intro-text">
            Sử dụng phím tắt trên bàn phím để thao tác cực nhanh và chuyên nghiệp khi chơi cờ:
          </p>

          <div className="shortcuts-table">
            {shortcuts.map((sc, i) => (
              <div key={i} className="shortcut-row">
                <div className="shortcut-keys">
                  {sc.key.split('  /  ').map((combo, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="shortcut-or">hoặc</span>}
                      <kbd className="kbd-badge">{combo}</kbd>
                    </React.Fragment>
                  ))}
                </div>
                <div className="shortcut-details">
                  <strong>{sc.action}</strong>
                  <span>{sc.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
