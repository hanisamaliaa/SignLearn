import { useNavigate } from "react-router-dom";
import { Badge, Button, Modal } from "../ui/ui";

export default function PremiumModal({open,onClose}){
  const navigate=useNavigate();
  return <Modal open={open} onClose={onClose} title="Quiz adalah fitur Premium" size="sm">
    <div className="premium-lock-modal">
      <div className="premium-lock-icon">🔒</div>
      <Badge variant="warning">SignLearn Premium</Badge>
      <p>Materi dan video tetap gratis. Upgrade Premium untuk mengerjakan quiz 5 soal dan melihat evaluasi belajarmu.</p>
      <ul><li>✓ Quiz setelah setiap lesson</li><li>✓ Riwayat nilai dan pembahasan</li><li>✓ Rp29.000 untuk 30 hari</li></ul>
      <div className="flex gap-3"><Button variant="outline" fullWidth onClick={onClose}>Nanti</Button><Button fullWidth onClick={()=>navigate("/premium")}>Lihat Premium</Button></div>
    </div>
  </Modal>;
}
